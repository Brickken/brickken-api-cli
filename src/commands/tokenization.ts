import { Command } from 'commander';
import { mapNewTokenizationInput } from '@brickken/core';
import { runPrepareCommand, withExecuteOption, withFileOption } from './shared';

export function registerTokenizationCommands(program: Command): void {
	const tokenization = program.command('tokenization').description('Manage tokenization flows');

	withExecuteOption(
		withFileOption(
			tokenization
				.command('create')
				.description('Prepare a new tokenization transaction')
				.option('--chain <chain>', 'Chain identifier (decimal, 0x-prefixed, or Brickken chain value)')
				.option('--tokenizer-email <email>', 'Tokenizer email')
				.option('--tokenizer-address <address>', 'Tokenizer wallet address')
				.option('--signer-address <address>', 'Explicit signer wallet address')
				.option('--token-name <name>', 'Token name')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--supply-cap <amount>', 'Maximum supply cap')
				.option('--url <url>', 'Token documentation URL')
				.option('--payment-token-address <address>', 'Optional payment token address')
				.option('--token-type <type>', 'Token type')
				.option('--tokenizer-name <name>', 'Tokenizer first name')
				.option('--tokenizer-surname <surname>', 'Tokenizer surname')
				.option('--company-name <name>', 'Tokenizer company name')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Tokenization create',
			mapInput: mapNewTokenizationInput
		});
	});
}
