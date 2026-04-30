import axios, { AxiosResponse, Method } from 'axios';
import { X402Metadata, ResolvedConfig } from './types';
import {
	attachX402Metadata,
	buildX402PaymentHeader,
	decodePaymentRequired,
	decodePaymentResponse
} from './x402';

export class HttpError extends Error {
	status: number;
	data: any;

	constructor(message: string, status: number, data: any) {
		super(message);
		this.name = 'HttpError';
		this.status = status;
		this.data = data;
	}
}

type Primitive = string | number | boolean;

export interface JsonRequestOptions {
	method: Method;
	path: string;
	query?: Record<string, Primitive | undefined>;
	data?: any;
}

interface BaseRequestOptions extends JsonRequestOptions {
	headers?: Record<string, string>;
}

function buildHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
	return {
		...extraHeaders
	};
}

function cleanQuery(
	query?: Record<string, Primitive | undefined>
): Record<string, Primitive> | undefined {
	if (!query) {
		return undefined;
	}

	return Object.fromEntries(
		Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
	) as Record<string, Primitive>;
}

async function sendRequest<T>(
	config: ResolvedConfig,
	options: BaseRequestOptions,
	extraHeaders: Record<string, string> = {}
): Promise<AxiosResponse<T>> {
	return axios.request<T>({
		baseURL: config.baseUrl,
		url: options.path,
		method: options.method,
		params: cleanQuery(options.query),
		data: options.data,
		headers: buildHeaders({
			...(options.headers || {}),
			...extraHeaders
		}),
		validateStatus: () => true,
		maxBodyLength: Infinity,
		maxContentLength: Infinity
	});
}

function decorateWithSettlement<T>(response: AxiosResponse<T>, metadata?: X402Metadata): T {
	const settlement = decodePaymentResponse(response.headers as Record<string, unknown> | undefined);
	if (!metadata && !settlement) {
		return response.data;
	}

	return attachX402Metadata(
		response.data,
		metadata ? { ...metadata, settlement } : undefined
	) as T;
}

function throwHttpError<T>(
	response: AxiosResponse<T>,
	messagePrefix: string,
	metadata?: X402Metadata
): never {
	throw new HttpError(
		`${messagePrefix} with status ${response.status}`,
		response.status,
		decorateWithSettlement(response, metadata)
	);
}

async function handleResponse<T>(
	config: ResolvedConfig,
	options: BaseRequestOptions,
	response: AxiosResponse<T>,
	messagePrefix: string
): Promise<T> {
	if (response.status >= 200 && response.status < 300) {
		return decorateWithSettlement(response);
	}

	if (response.status === 402 && config.privateKey) {
		const paymentRequired = decodePaymentRequired(
			response.headers as Record<string, unknown> | undefined
		);
		if (paymentRequired) {
			const { encodedHeader, metadata } = await buildX402PaymentHeader(
				config.privateKey,
				paymentRequired
			);
			const retriedResponse = await sendRequest<T>(config, options, {
				'X-Payment': encodedHeader
			});

			if (retriedResponse.status >= 200 && retriedResponse.status < 300) {
				return decorateWithSettlement(retriedResponse, metadata);
			}

			throwHttpError(retriedResponse, messagePrefix, metadata);
		}
	}

	throwHttpError(response, messagePrefix);
}

export async function requestJson<T>(
	config: ResolvedConfig,
	options: JsonRequestOptions
): Promise<T> {
	const requestOptions: BaseRequestOptions = {
		...options,
		headers: {
			'Content-Type': 'application/json'
		}
	};
	const response = await sendRequest<T>(config, requestOptions);
	return handleResponse(config, requestOptions, response, 'Brickken API request failed');
}
