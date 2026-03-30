import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';
import { registerInfoCommands } from './commands/info';
import { registerStoCommands } from './commands/sto';
import { registerTokenCommands } from './commands/token';
import { registerTokenizationCommands } from './commands/tokenization';
import { registerTxCommands } from './commands/tx';

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
		.description('Brickken CLI for API V2 tokenization, token, STO, info, and tx workflows')
		.version(getPackageVersion())
		.showHelpAfterError()
		.addOption(
			new Option('--env <environment>', 'Target Brickken environment')
				.choices(['sandbox', 'production'])
		)
		.option('--base-url <url>', 'Override the Brickken API base URL')
		.option('--api-key <key>', 'Brickken API key')
		.option('--private-key <key>', 'Private key used for local signing and x402 payment flows')
		.option('--env-file <path>', 'Optional env file to load before resolving config')
		.option('--json', 'Print machine-readable JSON output');

	registerTokenizationCommands(program);
	registerStoCommands(program);
	registerTokenCommands(program);
	registerInfoCommands(program);
	registerTxCommands(program);

	return program;
}
