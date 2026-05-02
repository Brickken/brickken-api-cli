import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';
import { registerTxCommands } from './commands/tx';
import { registerAgentCommands } from './commands/agent';
import { registerTokenEconomicsCommands } from './commands/economics';

function getPackageVersion(): string {
	try {
		const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version?: string };
		return packageJson.version || '0.0.0';
	} catch {
		return process.env.npm_package_version || '0.0.0';
	}
}

export function buildProgram(): Command {
	const program = new Command();

	program
		.name('brickken')
		.description('Brickken CLI for x402-paid agentic API V2 transaction workflows')
		.version(getPackageVersion())
		.showHelpAfterError()
		.addOption(
			new Option('--env <environment>', 'Target Brickken environment')
				.choices(['sandbox', 'production'])
		)
		.option('--base-url <url>', 'Override the Brickken API base URL')
		.option('--private-key <key>', 'Private key used for local signing and x402 payment flows')
		.option('--rpc-url <url>', 'RPC URL used to wait for token deployment receipts')
		.option('--env-file <path>', 'Optional env file to load before resolving config')
		.option('--json', 'Print machine-readable JSON output');

	registerAgentCommands(program);
	registerTokenEconomicsCommands(program);
	registerTxCommands(program);

	return program;
}
