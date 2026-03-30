import { Command } from 'commander';
import { readStructuredFile } from '../files';
import { requestJson, executePreparedResponse, cleanInput, ResolvedConfig } from '@brickken/core';
import { signTransactionsLocally } from '@brickken/core';
import { resolveCliConfig } from '../cli-config';
import { hasLogicalFailure, printResult } from '../output';

type JsonMethod = 'GET' | 'POST' | 'PATCH';

type Mapper = (input: Record<string, any>) => Record<string, any>;
type QueryBuilder = (input: Record<string, any>) => Record<string, any>;

const DEFAULT_EXCLUDED_OPTIONS = ['file', 'execute'];

export function collectValues(value: string, previous: string[] = []): string[] {
	return [...previous, value];
}

export function withFileOption(command: Command, description = 'Path to a JSON or YAML input file'): Command {
	return command.option('-f, --file <path>', description);
}

export function withExecuteOption(command: Command): Command {
	return command.option('--execute', 'Prepare, sign locally, and send the transaction');
}

export async function buildCommandInput(
	options: Record<string, any>,
	excludedKeys: string[] = DEFAULT_EXCLUDED_OPTIONS
): Promise<Record<string, any>> {
	const fileInput = options.file ? await readStructuredFile(options.file) : {};
	const localOverrides = Object.fromEntries(
		Object.entries(options).filter(([key, value]) => {
			if (excludedKeys.includes(key) || value === undefined) {
				return false;
			}

			if (Array.isArray(value) && value.length === 0) {
				return false;
			}

			return true;
		})
	);

	return cleanInput({
		...fileInput,
		...localOverrides
	});
}

export async function runPrepareCommand(params: {
	command: Command;
	options: Record<string, any>;
	label: string;
	mapInput: Mapper;
}): Promise<void> {
	const config = resolveCliConfig(params.command);
	const commandInput = await buildCommandInput(params.options);
	const body = params.mapInput(commandInput);

	const prepared = await requestJson<any>(config, {
		method: 'POST',
		path: '/prepare-transactions',
		data: body
	});

	const result = params.options.execute
		? await executePreparedResponse(config, body, prepared)
		: prepared;

	printResult(result, config, params.label);
	if (hasLogicalFailure(result)) {
		process.exitCode = 1;
	}
}

export async function runDirectJsonCommand(params: {
	command: Command;
	options: Record<string, any>;
	label: string;
	path: string;
	method?: JsonMethod;
	mapInput?: Mapper;
}): Promise<void> {
	const config = resolveCliConfig(params.command);
	const commandInput = await buildCommandInput(params.options, ['file']);
	const data = params.mapInput ? params.mapInput(commandInput) : commandInput;

	const result = await requestJson<any>(config, {
		method: params.method || 'POST',
		path: params.path,
		data
	});

	printResult(result, config, params.label);
	if (hasLogicalFailure(result)) {
		process.exitCode = 1;
	}
}

export async function runInfoCommand(params: {
	command: Command;
	options: Record<string, any>;
	label: string;
	path: string;
	buildQuery: QueryBuilder;
}): Promise<void> {
	const config = resolveCliConfig(params.command);
	const queryInput = await buildCommandInput(params.options, ['file']);
	const result = await requestJson<any>(config, {
		method: 'GET',
		path: params.path,
		query: params.buildQuery(queryInput)
	});

	printResult(result, config, params.label);
	if (hasLogicalFailure(result)) {
		process.exitCode = 1;
	}
}

export async function runLocalSigningCommand(params: {
	command: Command;
	options: Record<string, any>;
	label: string;
}): Promise<void> {
	const config = resolveCliConfig(params.command);
	const commandInput = await buildCommandInput(params.options, ['file']);
	const privateKey = config.privateKey;

	if (!privateKey) {
		throw new Error(
			'A private key is required for tx sign. Set BKN_PRIVATE_KEY or BRICKKEN_PRIVATE_KEY, or pass --private-key.'
		);
	}

	const transactions = Array.isArray(commandInput.transactions)
		? commandInput.transactions
		: [commandInput.transaction || commandInput];

	const { signerAddress, signedTransactions } = await signTransactionsLocally(
		transactions,
		privateKey,
		commandInput.signerAddress
	);

	const result =
		signedTransactions.length === 1
			? {
					signerAddress,
					signedTransaction: signedTransactions[0]
			  }
			: {
					signerAddress,
					signedTransactions
			  };

	printResult(result, config, params.label);
}
