import FormData from 'form-data';
import { Command } from 'commander';
import {
	mapApproveInput,
	mapBurnInput,
	mapDividendInput,
	mapMintInput,
	mapTransferInput,
	mapWhitelistInput,
	requestMultipart,
	executePreparedResponse
} from '../internal/core';
import { readBinaryFile } from '../files';
import { resolveCliConfig } from '../cli-config';
import { hasLogicalFailure, printResult } from '../output';
import { buildCommandInput, runPrepareCommand, withExecuteOption, withFileOption } from './shared';

export function registerTokenCommands(program: Command): void {
	const token = program.command('token').description('Manage token operations');
	const tokenDocs = token.command('docs').description('Patch token documents');

	withExecuteOption(
		withFileOption(
			token.command('mint')
				.description('Prepare a mint transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--investor-email <email>', 'Investor email for single-recipient mint')
				.option('--investor-address <address>', 'Investor address for single-recipient mint')
				.option('--amount <amount>', 'Amount to mint')
				.option('--need-whitelist <value>', 'Whether whitelist is required for the recipient')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Token mint',
			mapInput: mapMintInput
		});
	});

	withExecuteOption(
		withFileOption(
			token.command('whitelist')
				.description('Prepare a whitelist update transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--investor-address <address>', 'Investor address for single-recipient update')
				.option('--allow <value>', 'Whitelist status for the investor')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Token whitelist',
			mapInput: mapWhitelistInput
		});
	});

	withExecuteOption(
		withFileOption(
			token.command('burn')
				.description('Prepare a burn transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--amount <amount>', 'Amount to burn')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Token burn',
			mapInput: mapBurnInput
		});
	});

	withExecuteOption(
		withFileOption(
			token.command('transfer')
				.description('Prepare a transfer or transferFrom transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--from <address>', 'Owner address for transferFrom mode')
				.option('--to <address>', 'Recipient address')
				.option('--amount <amount>', 'Amount to transfer')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Token transfer',
			mapInput: mapTransferInput
		});
	});

	withExecuteOption(
		withFileOption(
			token.command('approve')
				.description('Prepare an approve transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--investor-address <address>', 'Investor address for payment-token approve flows')
				.option('--spender-address <address>', 'Spender address')
				.option('--amount <amount>', 'Approval amount')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Token approve',
			mapInput: mapApproveInput
		});
	});

	withExecuteOption(
		withFileOption(
			token.command('dividend')
				.description('Prepare a dividend distribution transaction')
				.option('--chain <chain>', 'Chain identifier')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--amount <amount>', 'Dividend amount')
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'Token dividend',
			mapInput: mapDividendInput
		});
	});

	withExecuteOption(
		withFileOption(
			tokenDocs.command('update')
				.description('Upload token documentation assets and optionally execute the returned changeUrl transaction')
				.option('--token-symbol <symbol>', 'Token symbol')
				.option('--signer-address <address>', 'Signer wallet address')
				.option('--token-logotype <path>', 'Path to the token logotype image')
				.option('--subscription-agreement <path>', 'Path to the subscription agreement PDF')
				.option('--legal-docs <path>', 'Path to the legal documents PDF')
		)
	).action(async (options, command) => {
		const config = resolveCliConfig(command);
		const input = await buildCommandInput(options, ['file', 'execute']);
		const form = new FormData();

		if (!input.tokenSymbol) {
			throw new Error('tokenSymbol is required for token docs update');
		}
		if (!input.signerAddress) {
			throw new Error('signerAddress is required for token docs update');
		}

		form.append('tokenSymbol', input.tokenSymbol);
		form.append('signerAddress', input.signerAddress);

		if (input.tokenLogotype) {
			form.append('tokenLogotype', await readBinaryFile(input.tokenLogotype), {
				filename: input.tokenLogotype.split('/').pop() || 'token-logotype'
			});
		}
		if (input.subscriptionAgreement) {
			form.append('subscriptionAgreement', await readBinaryFile(input.subscriptionAgreement), {
				filename: input.subscriptionAgreement.split('/').pop() || 'subscription-agreement'
			});
		}
		if (input.legalDocs) {
			form.append('legalDocs', await readBinaryFile(input.legalDocs), {
				filename: input.legalDocs.split('/').pop() || 'legal-docs'
			});
		}

		const patched = await requestMultipart<any>(config, '/patch-token-docs', form);
		const result = options.execute
			? await executePreparedResponse(config, input, patched)
			: patched;

		printResult(result, config, 'Token docs update');
		if (hasLogicalFailure(result)) {
			process.exitCode = 1;
		}
	});
}
