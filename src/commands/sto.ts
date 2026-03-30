import { Command } from 'commander';
import { mapClaimInput, mapCloseInput, mapInvestInput, mapNewStoInput } from '../internal/core';
import { runPrepareCommand, withExecuteOption, withFileOption } from './shared';

export function registerStoCommands(program: Command): void {
	const sto = program.command('sto').description('Manage STO lifecycle commands');

	withExecuteOption(
		withFileOption(
			sto.command('create')
				.description('Prepare a new STO transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--tokenizer-email <email>', 'Tokenizer email')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--token-amount <amount>', 'Token amount to offer')
				.option('--offering-name <name>', 'Offering name')
				.option('--accepted-coin <symbol>', 'Accepted payment token symbol')
				.option('--start-date <iso-date>', 'Offering start date')
				.option('--end-date <iso-date>', 'Offering end date')
				.option('--min-raise-usd <amount>', 'Minimum raise in USD')
				.option('--max-raise-usd <amount>', 'Maximum raise in USD')
				.option('--min-investment <amount>', 'Minimum investment')
				.option('--max-investment <amount>', 'Maximum investment')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'STO create',
			mapInput: mapNewStoInput
		});
	});

	withExecuteOption(
		withFileOption(
			sto.command('invest')
				.description('Prepare a new STO investment transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--investor-email <email>', 'Investor email')
				.option('--investor-address <address>', 'Investor wallet address')
				.option('--signer-address <address>', 'Explicit signer wallet address')
				.option('--amount <amount>', 'Investment amount')
				.option('--payment-token-symbol <symbol>', 'Optional payment token symbol')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'STO invest',
			mapInput: mapInvestInput
		});
	});

	withExecuteOption(
		withFileOption(
			sto.command('claim')
				.description('Prepare an STO claim transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--investor-email <email>', 'Investor email')
				.option('--investor-address <address>', 'Investor wallet address')
				.option('--signer-address <address>', 'Explicit signer wallet address')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'STO claim',
			mapInput: mapClaimInput
		});
	});

	withExecuteOption(
		withFileOption(
			sto.command('close')
				.description('Prepare an STO close transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--tokenizer-email <email>', 'Tokenizer email')
				.option('--signer-address <address>', 'Signer wallet address')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'STO close',
			mapInput: mapCloseInput
		});
	});
}
