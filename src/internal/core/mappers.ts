import { normalizeChainId } from './config';
import { RecordLike } from './types';

function cleanObject<T extends RecordLike>(input: T): T {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined)
	) as T;
}

function toBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim().toLowerCase();
	if (['true', '1', 'yes', 'allow', 'allowed'].includes(normalized)) {
		return true;
	}
	if (['false', '0', 'no', 'deny', 'denied'].includes(normalized)) {
		return false;
	}
	return undefined;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function normalizeStringArray(value: unknown): string[] | undefined {
	const values = normalizeArray(value as string | string[] | undefined)
		.map((entry) => String(entry).trim())
		.filter(Boolean);

	return values.length > 0 ? values : undefined;
}

function buildBasePayload(input: RecordLike): RecordLike {
	return cleanObject({
		...input,
		chainId: normalizeChainId(input.chainId || input.chain),
		signerAddress: input.signerAddress
	});
}

function normalizeAgentServices(input: RecordLike): RecordLike[] | undefined {
	if (Array.isArray(input.services)) {
		return input.services;
	}

	if (!input.serviceName && !input.serviceEndpoint && !input.serviceVersion) {
		return undefined;
	}

	return [
		cleanObject({
			name: input.serviceName,
			endpoint: input.serviceEndpoint,
			version: input.serviceVersion
		})
	];
}

export function mapAgentRegisterInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentRegister',
		ownerEmail: input.ownerEmail || input.email,
		name: input.name,
		description: input.description,
		image: input.image,
		services: normalizeAgentServices(input),
		metadata: input.metadata,
		aiModelName: input.aiModelName,
		aiModelProvider: input.aiModelProvider,
		tags: normalizeStringArray(input.tags || input.tag),
		version: input.version,
		documentation: input.documentation,
		sourceCode: input.sourceCode,
		license: input.license,
		agentType: input.agentType,
		supportedTrust: normalizeStringArray(input.supportedTrust),
		x402Support: toBoolean(input.x402Support) ?? input.x402Support,
		active: toBoolean(input.active) ?? input.active,
		gasLimit: input.gasLimit
	});
}

export function mapAgentSetUriInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentSetURI',
		agentUuid: input.agentUuid,
		agentId: input.agentId,
		name: input.name,
		description: input.description,
		image: input.image,
		services: normalizeAgentServices(input),
		metadata: input.metadata,
		aiModelName: input.aiModelName,
		aiModelProvider: input.aiModelProvider,
		tags: normalizeStringArray(input.tags || input.tag),
		version: input.version,
		documentation: input.documentation,
		sourceCode: input.sourceCode,
		license: input.license,
		agentType: input.agentType,
		supportedTrust: normalizeStringArray(input.supportedTrust),
		x402Support: toBoolean(input.x402Support) ?? input.x402Support,
		active: toBoolean(input.active) ?? input.active,
		gasLimit: input.gasLimit
	});
}

export function mapAgentSetMetadataInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentSetMetadata',
		agentUuid: input.agentUuid,
		agentId: input.agentId,
		metadataKey: input.metadataKey,
		metadataValue: input.metadataValue,
		metadataEncoding: input.metadataEncoding,
		aiModelName: input.aiModelName,
		aiModelProvider: input.aiModelProvider,
		gasLimit: input.gasLimit
	});
}

export function mapAgentSetWalletInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentSetWallet',
		agentUuid: input.agentUuid,
		agentId: input.agentId,
		newWallet: input.newWallet,
		deadline: input.deadline,
		signature: input.signature,
		gasLimit: input.gasLimit
	});
}

export function mapCreateTokenInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentCreateToken',
		ownerEmail: input.ownerEmail || input.email,
		name: input.name,
		symbol: input.symbol || input.tokenSymbol,
		agentWallet: input.agentWallet,
		premint: input.premint,
		decimals: input.decimals,
		gasLimit: input.gasLimit
	});
}

export function mapMintTokenInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentMintToken',
		ownerEmail: input.ownerEmail || input.email,
		tokenAddress: input.tokenAddress,
		to: input.to || input.recipient || input.recipientAddress,
		amount: input.amount,
		decimals: input.decimals,
		gasLimit: input.gasLimit
	});
}

export function mapBurnTokenInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentBurnToken',
		ownerEmail: input.ownerEmail || input.email,
		tokenAddress: input.tokenAddress,
		from: input.from,
		amount: input.amount,
		decimals: input.decimals,
		gasLimit: input.gasLimit
	});
}

export function mapAgentGiveFeedbackInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentGiveFeedback',
		agentUuid: input.agentUuid,
		agentId: input.agentId,
		email: input.email,
		value: input.value,
		valueDecimals: input.valueDecimals,
		tag1: input.tag1,
		tag2: input.tag2,
		endpoint: input.endpoint,
		feedbackURI: input.feedbackURI || input.feedbackUri,
		feedbackHash: input.feedbackHash,
		gasLimit: input.gasLimit
	});
}

export function mapAgentRevokeFeedbackInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentRevokeFeedback',
		agentId: input.agentId,
		email: input.email,
		feedbackIndex: input.feedbackIndex,
		gasLimit: input.gasLimit
	});
}

export function mapAgentAppendFeedbackResponseInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'agentAppendFeedbackResponse',
		agentId: input.agentId,
		email: input.email,
		clientAddress: input.clientAddress,
		feedbackIndex: input.feedbackIndex,
		responseURI: input.responseURI || input.responseUri,
		responseHash: input.responseHash,
		gasLimit: input.gasLimit
	});
}

export function prepareBodyForMethod(method: string, input: RecordLike): RecordLike {
	switch (method) {
		case 'agentRegister':
			return mapAgentRegisterInput(input);
		case 'agentSetURI':
			return mapAgentSetUriInput(input);
		case 'agentSetMetadata':
			return mapAgentSetMetadataInput(input);
		case 'agentSetWallet':
			return mapAgentSetWalletInput(input);
		case 'createToken':
			return mapCreateTokenInput(input);
		case 'mintToken':
			return mapMintTokenInput(input);
		case 'burnToken':
			return mapBurnTokenInput(input);
		case 'agentGiveFeedback':
			return mapAgentGiveFeedbackInput(input);
		case 'agentRevokeFeedback':
			return mapAgentRevokeFeedbackInput(input);
		case 'agentAppendFeedbackResponse':
			return mapAgentAppendFeedbackResponseInput(input);
		default:
			return cleanObject({
				...input,
				method,
				chainId: normalizeChainId(input.chainId || input.chain)
			});
	}
}

export function cleanInput(input: RecordLike): RecordLike {
	return cleanObject(input);
}
