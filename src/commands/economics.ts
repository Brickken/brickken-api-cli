import { Command } from 'commander';
import {
	lookupTokenAddressFromSendResult,
	mapApproveTokenInput,
	mapBurnTokenInput,
	mapCreateTokenInput,
	mapMintTokenInput,
	mapTransferFromTokenInput,
	mapTransferTokenInput
} from '../internal/core';
import {
	runPrepareCommand,
	withExecuteOption,
	withExecutionModeOption,
	withFileOption
} from './shared';

function withEconomicsBaseOptions(command: Command): Command {
	return withExecutionModeOption(
		command
			.option('--chain <chain>', 'Chain identifier')
			.option('--signer-address <address>', 'Signer wallet address')
			.option('--gas-limit <value>', 'Optional explicit gas limit')
	);
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

	withExecuteOption(
		withFileOption(
			withEconomicsBaseOptions(
				program.command('transfer')
					.description('Prepare or execute an agentic token transfer')
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
			label: 'Transfer token',
			mapInput: mapTransferTokenInput
		});
	});

	withExecuteOption(
		withFileOption(
			withEconomicsBaseOptions(
				program.command('transfer-from')
					.description('Prepare or execute an agentic token transferFrom')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--token-address <address>', 'ERC-20 token address')
					.option('--from <address>', 'Source wallet address')
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
			label: 'Transfer token from allowance',
			mapInput: mapTransferFromTokenInput
		});
	});

	withExecuteOption(
		withFileOption(
			withEconomicsBaseOptions(
				program.command('approve')
					.description('Prepare or execute an agentic token approval')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--token-address <address>', 'ERC-20 token address')
					.option('--spender-address <address>', 'Spender wallet address')
					.option('--spender <address>', 'Alias for --spender-address')
					.option('--amount <amount>', 'Human-readable token amount')
					.option('--decimals <value>', 'Token decimals')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Approve token allowance',
			mapInput: mapApproveTokenInput
		});
	});
}
