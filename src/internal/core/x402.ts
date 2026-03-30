import { ethers } from 'ethers';
import { X402Metadata, X402Requirement } from './types';

interface X402PaymentRequired {
	x402Version: number;
	accepts: X402Requirement[];
}

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
	TransferWithAuthorization: [
		{ name: 'from', type: 'address' },
		{ name: 'to', type: 'address' },
		{ name: 'value', type: 'uint256' },
		{ name: 'validAfter', type: 'uint256' },
		{ name: 'validBefore', type: 'uint256' },
		{ name: 'nonce', type: 'bytes32' }
	]
};

function getHeaderValue(
	headers: Record<string, unknown> | undefined,
	headerName: string
): string | undefined {
	if (!headers) {
		return undefined;
	}

	const expected = headerName.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() !== expected || value === undefined || value === null) {
			continue;
		}

		return Array.isArray(value) ? String(value[0]) : String(value);
	}

	return undefined;
}

function decodeBase64Json<T>(encoded: string, description: string): T {
	try {
		return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as T;
	} catch {
		throw new Error(`Invalid ${description} header: could not decode base64 JSON payload`);
	}
}

function getPaymentChainIdDecimal(network: string): number {
	const [namespace, chainId] = network.split(':');
	if (namespace !== 'eip155' || !chainId || !/^\d+$/.test(chainId)) {
		throw new Error(`Unsupported x402 payment network "${network}"`);
	}

	return Number.parseInt(chainId, 10);
}

export function decodePaymentRequired(
	headers: Record<string, unknown> | undefined
): X402PaymentRequired | undefined {
	const encoded = getHeaderValue(headers, 'payment-required');
	if (!encoded) {
		return undefined;
	}

	return decodeBase64Json<X402PaymentRequired>(encoded, 'PAYMENT-REQUIRED');
}

export function decodePaymentResponse(
	headers: Record<string, unknown> | undefined
): Record<string, any> | undefined {
	const encoded = getHeaderValue(headers, 'payment-response');
	if (!encoded) {
		return undefined;
	}

	return decodeBase64Json<Record<string, any>>(encoded, 'PAYMENT-RESPONSE');
}

export async function buildX402PaymentHeader(
	privateKey: string,
	paymentRequired: X402PaymentRequired
): Promise<{ encodedHeader: string; metadata: X402Metadata }> {
	const requirement = paymentRequired.accepts?.[0];
	if (!requirement) {
		throw new Error('PAYMENT-REQUIRED did not include any accepted payment options');
	}

	const tokenName = requirement.extra?.name;
	const tokenVersion = requirement.extra?.version;
	if (!tokenName || !tokenVersion) {
		throw new Error('PAYMENT-REQUIRED is missing token metadata required for x402 signing');
	}

	const wallet = new ethers.Wallet(privateKey);
	const now = Math.floor(Date.now() / 1000);
	const authorization = {
		from: wallet.address,
		to: requirement.payTo,
		value: requirement.amount,
		validAfter: String(now - 60),
		validBefore: String(now + 300),
		nonce: ethers.utils.hexlify(ethers.utils.randomBytes(32))
	};

	const signature = await wallet._signTypedData(
		{
			name: tokenName,
			version: tokenVersion,
			chainId: getPaymentChainIdDecimal(requirement.network),
			verifyingContract: requirement.asset
		},
		TRANSFER_WITH_AUTHORIZATION_TYPES,
		authorization
	);

	const payload = {
		x402Version: paymentRequired.x402Version || 2,
		accepted: {
			scheme: requirement.scheme,
			network: requirement.network,
			asset: requirement.asset,
			amount: requirement.amount,
			payTo: requirement.payTo
		},
		payload: {
			signature,
			authorization
		}
	};

	return {
		encodedHeader: Buffer.from(JSON.stringify(payload)).toString('base64'),
		metadata: {
			payerAddress: wallet.address,
			requirement
		}
	};
}

export function attachX402Metadata<T>(data: T, metadata?: X402Metadata): any {
	if (!metadata) {
		return data;
	}

	if (data && typeof data === 'object' && !Array.isArray(data)) {
		return {
			...(data as Record<string, any>),
			_x402: metadata
		};
	}

	return {
		result: data,
		_x402: metadata
	};
}
