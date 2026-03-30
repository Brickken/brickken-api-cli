import dotenv from 'dotenv';
import { Command } from 'commander';
import {
	ResolvedConfig,
	BrickkenEnvironment,
	normalizeChainId,
	SANDBOX_BASE_URL,
	PRODUCTION_BASE_URL
} from '@brickken/core';

export { normalizeChainId };

export interface GlobalCliOptions {
	env?: BrickkenEnvironment;
	baseUrl?: string;
	apiKey?: string;
	privateKey?: string;
	envFile?: string;
	json?: boolean;
}

const loadedEnvFiles = new Set<string>();

export function getGlobalOptions(command: Command): GlobalCliOptions {
	return command.optsWithGlobals() as GlobalCliOptions;
}

export function loadEnvFile(envFile?: string): void {
	if (!envFile || loadedEnvFiles.has(envFile)) {
		return;
	}

	const result = dotenv.config({ path: envFile });
	if (result.error) {
		throw new Error(`Unable to load env file "${envFile}": ${result.error.message}`);
	}

	loadedEnvFiles.add(envFile);
}

export function resolveCliConfig(command: Command): ResolvedConfig & { outputJson: boolean } {
	const options = getGlobalOptions(command);

	loadEnvFile(options.envFile);

	const env = (options.env || 'sandbox') as BrickkenEnvironment;
	const baseUrl =
		options.baseUrl ||
		process.env.BRICKKEN_BASE_URL ||
		process.env.BKN_BASE_URL ||
		(env === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL);

	return {
		env,
		baseUrl,
		apiKey: options.apiKey || process.env.BRICKKEN_API_KEY || process.env.BKN_API_KEY,
		privateKey:
			options.privateKey || process.env.BRICKKEN_PRIVATE_KEY || process.env.BKN_PRIVATE_KEY,
		outputJson: Boolean(options.json)
	};
}
