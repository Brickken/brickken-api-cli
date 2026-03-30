import { Command } from 'commander';
import { normalizeChainId } from '../cli-config';
import { runInfoCommand } from './shared';

export function registerInfoCommands(program: Command): void {
	const info = program.command('info').description('Read Brickken API information endpoints');

	info.command('network')
		.description('Get supported network information')
		.requiredOption('--chain <chain>', 'Chain identifier')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Network info',
				path: '/get-network-info',
				buildQuery: (input) => ({
					chainId: normalizeChainId(input.chain)
				})
			});
		});

	info.command('token')
		.description('Get token information')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--chain <chain>', 'Chain identifier')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Token info',
				path: '/get-token-info',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					chainId: normalizeChainId(input.chain)
				})
			});
		});

	info.command('tokenizer')
		.description('Get tokenizer information by token symbol')
		.option('--token-symbol <symbol>', 'Token symbol')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Tokenizer info',
				path: '/get-tokenizer-info',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol
				})
			});
		});

	info.command('stos')
		.description('List STOs for a token')
		.option('--token-symbol <symbol>', 'Token symbol')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'STOs info',
				path: '/get-stos',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol
				})
			});
		});

	info.command('sto')
		.description('Get STO details by ID')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--sto-id <id>', 'STO ID')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'STO details',
				path: '/get-sto-by-id',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					id: input.stoId
				})
			});
		});

	info.command('investments')
		.description('Get investments by STO ID')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--sto-id <id>', 'STO ID')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Investments by STO',
				path: '/get-investments-by-sto-id',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					id: input.stoId
				})
			});
		});

	info.command('investor')
		.description('Get investor information')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--email <email>', 'Investor email')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Investor info',
				path: '/get-investor-info',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					email: input.email
				})
			});
		});

	info.command('allowance')
		.description('Get allowance information')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--owner-address <address>', 'Token owner address')
		.option('--spender-address <address>', 'Spender address')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Allowance info',
				path: '/get-allowance',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					ownerAddress: input.ownerAddress,
					spenderAddress: input.spenderAddress
				})
			});
		});

	info.command('whitelist')
		.description('Get whitelist status by investor address')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--investor-address <address>', 'Investor wallet address')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Whitelist status',
				path: '/get-whitelist-status',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					investorAddress: input.investorAddress
				})
			});
		});

	info.command('balance')
		.description('Get balance and whitelist information by investor email')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--investor-email <email>', 'Investor email')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Balance and whitelist info',
				path: '/get-balance-whitelist',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					investorEmail: input.investorEmail
				})
			});
		});

	info.command('sto-balance')
		.description('Get STO balance by ID')
		.option('--token-symbol <symbol>', 'Token symbol')
		.option('--sto-id <id>', 'STO ID')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'STO balance',
				path: '/get-sto-balance',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol,
					id: input.stoId
				})
			});
		});

	info.command('dividend')
		.description('Get dividend distribution information')
		.option('--token-symbol <symbol>', 'Token symbol')
		.action(async (options, command) => {
			await runInfoCommand({
				command,
				options,
				label: 'Dividend distribution info',
				path: '/get-dividend-distribution',
				buildQuery: (input) => ({
					tokenSymbol: input.tokenSymbol
				})
			});
		});
}
