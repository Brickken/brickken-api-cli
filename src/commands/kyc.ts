import { Command } from 'commander';
import { runDirectJsonCommand } from './shared';

const parseBoolean = (value: unknown, fieldName: string): boolean | undefined => {
	if (value === undefined) return undefined;
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') throw new Error(`${fieldName} must be true or false`);

	const normalized = value.trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	throw new Error(`${fieldName} must be true or false`);
};

export function registerKycCommands(program: Command): void {
	const kyc = program
		.command('kyc')
		.description('Create API-key-scoped investor KYC links');

	kyc.command('create-link')
		.description('Create or reuse an investor and return a Sumsub verification link')
		.requiredOption('--email <email>', 'Investor email address')
		.option('--need-kyc <true|false>', 'Whether the investor must complete KYC (default: true)')
		.action(async (options, command) => {
			await runDirectJsonCommand({
				command,
				options,
				label: 'KYC link',
				path: '/create-kyc-link',
				requiresApiKey: true,
				mapInput: input => ({
					email: input.email,
					...(input.needKyc === undefined
						? {}
						: { needKyc: parseBoolean(input.needKyc, 'needKyc') })
				})
			});
		});
}
