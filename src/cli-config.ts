import path from 'path';
import dotenv from 'dotenv';
import { Command } from 'commander';
import {
	ResolvedConfig,
	BrickkenEnvironment,
	normalizeChainId,
	SANDBOX_BASE_URL,
	PRODUCTION_BASE_URL
} from './internal/core';

export { normalizeChainId };

export interface GlobalCliOptions {
	env?: BrickkenEnvironment;
	baseUrl?: string;
	privateKey?: string;
	rpcUrl?: string;
	envFile?: string;
	json?: boolean;
}

const loadedEnvFiles = new Set<string>();

export function getGlobalOptions(command: Command): GlobalCliOptions {
	return command.optsWithGlobals() as GlobalCliOptions;
}

export function loadEnvFile(envFile?: string): void {
	const resolvedEnvFile = envFile || path.resolve(process.cwd(), '.env');

	if (loadedEnvFiles.has(resolvedEnvFile)) {
		return;
	}

	const result = envFile
		? dotenv.config({ path: resolvedEnvFile })
		: dotenv.config();

	if (result.error) {
		if (!envFile && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
			return;
		}

		throw new Error(`Unable to load env file "${resolvedEnvFile}": ${result.error.message}`);
	}

	loadedEnvFiles.add(resolvedEnvFile);
}

export function resolveCliConfig(command: Command): ResolvedConfig & { outputJson: boolean } {
	const options = getGlobalOptions(command);

	loadEnvFile(options.envFile);

	const env = (
		options.env ||
		process.env.BRICKKEN_ENV ||
		process.env.BKN_ENV ||
		'sandbox'
	) as BrickkenEnvironment;
	const baseUrl =
		options.baseUrl ||
		process.env.BRICKKEN_BASE_URL ||
		process.env.BKN_BASE_URL ||
		(env === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL);

	return {
		env,
		baseUrl,
		privateKey:
			options.privateKey || process.env.BRICKKEN_PRIVATE_KEY || process.env.BKN_PRIVATE_KEY,
		rpcUrl: options.rpcUrl || process.env.BRICKKEN_RPC_URL || process.env.BKN_RPC_URL,
		outputJson: Boolean(options.json)
	};
}
