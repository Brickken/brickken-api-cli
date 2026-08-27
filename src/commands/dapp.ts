import { Command, Option } from 'commander';
import { resolveCliConfig } from '../cli-config';
import { requestJson } from '../internal/core';
import { hasLogicalFailure, printResult } from '../output';
import { buildCommandInput, collectValues } from './shared';

type QueryValue = string | number | boolean;

function normalizePath(value: string): string {
	const path = value.trim();
	if (!path || path.includes('://') || path.startsWith('//')) {
		throw new Error('Dapp endpoint path must be a relative path such as /get-token-info');
	}

	return path.startsWith('/') ? path : `/${path}`;
}

function parseQueryEntries(entries: unknown): Record<string, QueryValue> {
	if (entries === undefined) {
		return {};
	}

	const values = Array.isArray(entries) ? entries : [entries];
	return Object.fromEntries(
		values.map(entry => {
			const separator = String(entry).indexOf('=');
			if (separator <= 0) {
				throw new Error(`Invalid query parameter "${entry}". Use --query key=value.`);
			}

			return [String(entry).slice(0, separator), String(entry).slice(separator + 1)];
		})
	) as Record<string, QueryValue>;
}

function printAndCheck(
	result: any,
	config: ReturnType<typeof resolveCliConfig>,
	label: string
): void {
	printResult(result, config, label);
	if (hasLogicalFailure(result)) {
		process.exitCode = 1;
	}
}

async function runDappGet(options: Record<string, any>, command: Command): Promise<void> {
	const config = resolveCliConfig(command);
	const queryFromFile = await buildCommandInput(options, ['file', 'path', 'query']);
	const query = {
		...queryFromFile,
		...parseQueryEntries(options.query)
	};
	const result = await requestJson<any>(config, {
		method: 'GET',
		path: normalizePath(options.path),
		apiKeyAuth: true,
		query
	});

	printAndCheck(result, config, 'Dapp API response');
}

async function runDappRequest(options: Record<string, any>, command: Command): Promise<void> {
	const config = resolveCliConfig(command);
	const data = await buildCommandInput(options, ['file', 'method', 'path']);
	const result = await requestJson<any>(config, {
		method: options.method,
		path: normalizePath(options.path),
		apiKeyAuth: true,
		data
	});

	printAndCheck(result, config, 'Dapp API response');
}

export function registerDappCommands(program: Command): void {
	const dapp = program
		.command('dapp')
		.description('Call API-key-authenticated Dapp API JSON endpoints');

	dapp.command('get')
		.description('Call a Dapp API GET endpoint')
		.requiredOption('--path <path>', 'Relative Dapp API endpoint path')
		.option('--query <key=value>', 'Query parameter (repeatable)', collectValues, [])
		.option('-f, --file <path>', 'JSON/YAML file containing query parameters')
		.action(runDappGet);

	dapp.command('request')
		.description('Call a Dapp API JSON POST or PATCH endpoint')
		.addOption(
			new Option('--method <method>', 'HTTP method')
				.choices(['POST', 'PATCH'])
				.makeOptionMandatory()
		)
		.requiredOption('--path <path>', 'Relative Dapp API endpoint path')
		.option('-f, --file <path>', 'JSON/YAML request body')
		.action(runDappRequest);
}
