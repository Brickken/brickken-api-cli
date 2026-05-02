import { Command } from 'commander';
import {
	lookupTokenAddressFromSendResult,
	mapBurnTokenInput,
	mapCreateTokenInput,
	mapMintTokenInput
} from '../internal/core';
import { runPrepareCommand, withExecuteOption, withFileOption } from './shared';

function withEconomicsBaseOptions(command: Command): Command {
	return command
		.option('--chain <chain>', 'Chain identifier')
		.option('--signer-address <address>', 'Signer wallet address')
		.option('--gas-limit <value>', 'Optional explicit gas limit');
}

export function registerTokenEconomicsCommands(program: Command): void {
	withExecuteOption(
		withFileOption(
			withEconomicsBaseOptions(
				program.command('create-token')
					.description('Prepare or execute an agentic ERC-20 token deployment')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--name <name>', 'Token name')
					.option('--symbol <symbol>', 'Token symbol')
					.option('--token-symbol <symbol>', 'Alias for --symbol')
					.option('--agent-wallet <address>', 'Wallet that owns/mints the token')
					.option('--premint <amount>', 'Human-readable premint amount')
					.option('--decimals <value>', 'Token decimals')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Create token',
			mapInput: mapCreateTokenInput,
			afterExecute: async ({ config, body, result }) => {
				if (!result?.sent) {
					return result;
				}

				return {
					...result,
					...(await lookupTokenAddressFromSendResult(config, body, result.sent))
				};
			}
		});
	});

	withExecuteOption(
		withFileOption(
			withEconomicsBaseOptions(
				program.command('mint')
					.description('Prepare or execute an agentic token mint')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--token-address <address>', 'ERC-20 token address')
					.option('--to <address>', 'Recipient wallet address')
					.option('--recipient-address <address>', 'Alias for --to')
					.option('--amount <amount>', 'Human-readable token amount')
					.option('--decimals <value>', 'Token decimals')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Mint token',
			mapInput: mapMintTokenInput
		});
	});

	withExecuteOption(
		withFileOption(
			withEconomicsBaseOptions(
				program.command('burn')
					.description('Prepare or execute an agentic token burn')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--token-address <address>', 'ERC-20 token address')
					.option('--from <address>', 'Wallet address to burn from')
					.option('--amount <amount>', 'Human-readable token amount')
					.option('--decimals <value>', 'Token decimals')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Burn token',
			mapInput: mapBurnTokenInput
		});
	});
}
