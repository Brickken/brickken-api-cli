import { BrickkenEnvironment, ResolvedConfig } from './types';

export const SANDBOX_BASE_URL = 'https://api.sandbox.brickken.com';
export const PRODUCTION_BASE_URL = 'https://api.brickken.com';

const KNOWN_DECIMAL_CHAIN_IDS: Record<string, string> = {
	'1': '1',
	'56': '38',
	'137': '89',
	'8453': '2105',
	'43114': 'a86a',
	'80002': '13882',
	'11155111': 'aa36a7'
};

export function normalizeChainId(chainId?: string): string | undefined {
	if (!chainId) {
		return undefined;
	}

	const raw = String(chainId).trim().toLowerCase();
	if (!raw) {
		return undefined;
	}

	if (raw.startsWith('0x')) {
		if (!/^0x[0-9a-f]+$/i.test(raw)) {
			throw new Error(`Invalid chain value "${chainId}"`);
		}
		return raw.slice(2);
	}

	if (/^[0-9a-f]+$/i.test(raw) && /[a-f]/i.test(raw)) {
		return raw;
	}

	if (/^[0-9]+$/.test(raw)) {
		return KNOWN_DECIMAL_CHAIN_IDS[raw] || raw;
	}

	throw new Error(`Invalid chain value "${chainId}"`);
}

export function resolveConfigFromEnv(): ResolvedConfig {
	const env = (process.env.BRICKKEN_ENV || 'sandbox') as BrickkenEnvironment;
	const baseUrl =
		process.env.BRICKKEN_BASE_URL ||
		process.env.BKN_BASE_URL ||
		(env === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL);

	return {
		env,
		baseUrl,
		privateKey: process.env.BRICKKEN_PRIVATE_KEY || process.env.BKN_PRIVATE_KEY,
		rpcUrl: process.env.BRICKKEN_RPC_URL || process.env.BKN_RPC_URL
	};
}
