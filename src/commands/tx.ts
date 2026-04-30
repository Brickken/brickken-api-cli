import { Command } from 'commander';
import { prepareBodyForMethod } from '../internal/core';
import {
	collectValues,
	runDirectJsonCommand,
	runInfoCommand,
	runLocalSigningCommand,
	runPrepareCommand,
	withExecuteOption,
	withFileOption
} from './shared';

export function registerTxCommands(program: Command): void {
	const tx = program.command('tx').description('Access raw Brickken API V2 transaction flows');

	withExecuteOption(
		withFileOption(
			tx.command('prepare')
				.description('Prepare raw Brickken transactions, or execute them with --execute')
				.requiredOption('--method <method>', 'Brickken transaction method')
				.option('--chain <chain>', 'Chain identifier')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--investor-address <address>', 'Investor wallet address')
				.option('--token-symbol <symbol>', 'Token symbol')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Transaction prepare',
			mapInput: (input) => prepareBodyForMethod(options.method, input)
		});
	});

	withFileOption(
		tx.command('sign')
			.description('Sign a transaction locally with the configured private key')
	).action(async (options, command) => {
		await runLocalSigningCommand({
			command,
			options,
			label: 'Transaction sign'
		});
	});

	withFileOption(
		tx.command('send')
			.description('Send signed transactions to Brickken API')
			.option('--tx-id <value>', 'Prepared transaction ID', collectValues, [])
			.option('--signed-tx <value>', 'Signed transaction hex', collectValues, [])
	).action(async (options, command) => {
		await runDirectJsonCommand({
			command,
			options,
			label: 'Transaction send',
			path: '/send-transactions',
			mapInput: (input) => {
				const txIds = input.txId;
				const signedTransactions = input.signedTx || input.signedTransactions;

				if (Array.isArray(txIds) && txIds.length === 1 && Array.isArray(signedTransactions) && signedTransactions.length === 1) {
					return {
						txId: txIds[0],
						signedTransactions: signedTransactions[0]
					};
				}

				return {
					txId: txIds,
					signedTransactions
				};
			}
		});
	});

	tx.command('status')
		.description('Get transaction status')
		.option('--hash <hash>', 'Actual blockchain transaction hash')
		.option('--tx-hash <hash>', 'Alias for --hash')
		.action(async (options, command) => {
			if (!options.hash && !options.txHash) {
				throw new Error('Either --hash or --tx-hash is required for tx status');
			}

			await runInfoCommand({
				command,
				options,
				label: 'Transaction status',
				path: '/get-transaction-status',
				buildQuery: (input) => ({
					hash: input.hash || input.txHash
				})
			});
		});

}
