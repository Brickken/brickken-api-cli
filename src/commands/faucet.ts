import { constants, utils } from 'ethers';
import { Command } from 'commander';
import { resolveCliConfig } from '../cli-config';
import { PRODUCTION_BASE_URL, requestJson, resolveUuidV4 } from '../internal/core';
import { printResult } from '../output';

export function registerFaucetCommands(program: Command): void {
	const faucet = program
		.command('faucet')
		.description('Request test BKN from the Sandbox/Forge faucet');

	faucet.command('bkn')
		.description('Request 100 BKN on Ethereum Sepolia with an API key or 0.01 USDC x402')
		.requiredOption('--recipient-address <address>', 'Non-zero Ethereum Sepolia recipient address')
		.option('--idempotency-key <uuid>', 'UUID v4 to reuse only for a retry of the same claim')
		.action(async (options, command) => {
			const config = resolveCliConfig(command);
			if (config.env === 'production' || config.baseUrl.replace(/\/+$/, '') === PRODUCTION_BASE_URL) {
				throw new Error('The BKN faucet is available only in Sandbox and Forge.');
			}
			if (config.apiKey && config.privateKey) {
				throw new Error('Configure either an API key or a private key for the BKN faucet, never both.');
			}
			if (!config.apiKey && !config.privateKey) {
				throw new Error('The BKN faucet requires an API key or a private key for x402 payment.');
			}
			if (!utils.isAddress(options.recipientAddress) || options.recipientAddress.toLowerCase() === constants.AddressZero.toLowerCase()) {
				throw new Error('recipientAddress must be a non-zero Ethereum address.');
			}

			const idempotencyKey = resolveUuidV4(options.idempotencyKey);
			const result = await requestJson<any>(config, {
				method: 'POST',
				path: '/faucet/bkn',
				apiKeyOrX402Auth: true,
				headers: { 'Idempotency-Key': idempotencyKey },
				data: { recipientAddress: options.recipientAddress }
			});

			printResult({ ...result, idempotencyKey }, config, 'BKN faucet');
		});
}
