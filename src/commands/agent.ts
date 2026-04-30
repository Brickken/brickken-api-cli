import { Command } from 'commander';
import {
	mapAgentAppendFeedbackResponseInput,
	mapAgentBurnTokenInput,
	mapAgentCreateTokenInput,
	mapAgentGiveFeedbackInput,
	mapAgentMintTokenInput,
	mapAgentRegisterInput,
	mapAgentRevokeFeedbackInput,
	mapAgentSetMetadataInput,
	mapAgentSetUriInput,
	mapAgentSetWalletInput
} from '../internal/core';
import { collectValues, runPrepareCommand, withExecuteOption, withFileOption } from './shared';

type Mapper = (input: Record<string, any>) => Record<string, any>;

function withAgentBaseOptions(command: Command): Command {
	return command
		.option('--chain <chain>', 'Chain identifier')
		.option('--signer-address <address>', 'Signer wallet address')
		.option('--gas-limit <value>', 'Optional explicit gas limit');
}

function withAgentReferenceOptions(command: Command): Command {
	return command
		.option('--agent-uuid <uuid>', 'Stored tokenized agent UUID')
		.option('--agent-id <id>', 'On-chain ERC-8004 agent ID');
}

function withAgentProfileOptions(command: Command): Command {
	return command
		.option('--name <name>', 'Agent display name')
		.option('--description <value>', 'Agent description')
		.option('--image <url>', 'Agent image URL')
		.option('--service-name <name>', 'Single service name')
		.option('--service-endpoint <url>', 'Single service endpoint')
		.option('--service-version <version>', 'Single service version')
		.option('--ai-model-name <name>', 'AI model name')
		.option('--ai-model-provider <provider>', 'AI model provider')
		.option('--tag <value>', 'Agent discovery tag', collectValues, [])
		.option('--version <value>', 'Agent profile version')
		.option('--documentation <url>', 'Documentation URL')
		.option('--source-code <url>', 'Source code URL')
		.option('--license <value>', 'License identifier or URL')
		.option('--agent-type <value>', 'Agent type')
		.option('--supported-trust <value>', 'Supported trust capability', collectValues, [])
		.option('--x402-support <value>', 'Whether the agent advertises x402 support')
		.option('--active <value>', 'Whether the agent is active');
}

async function runAgentPrepare(
	command: Command,
	options: Record<string, any>,
	label: string,
	mapInput: Mapper
): Promise<void> {
	await runPrepareCommand({
		command,
		options,
		label,
		mapInput
	});
}

export function registerAgentCommands(program: Command): void {
	const agent = program
		.command('agent')
		.description('Manage ERC-8004 agent identity, x402-capable agent tokens, and reputation');

	withExecuteOption(
		withFileOption(
			withAgentProfileOptions(
				withAgentBaseOptions(
					agent.command('register')
						.description('Prepare or execute an ERC-8004 agent registration')
						.option('--owner-email <email>', 'Tokenizer owner email')
						.option('--email <email>', 'Alias for --owner-email')
				)
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent register', mapAgentRegisterInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentProfileOptions(
				withAgentReferenceOptions(
					withAgentBaseOptions(
						agent.command('set-uri')
							.description('Prepare or execute an ERC-8004 agent URI/profile update')
					)
				)
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent set URI', mapAgentSetUriInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentReferenceOptions(
				withAgentBaseOptions(
					agent.command('set-metadata')
						.description('Prepare or execute an ERC-8004 metadata update')
						.option('--metadata-key <key>', 'Metadata key')
						.option('--metadata-value <value>', 'Metadata value')
						.option('--metadata-encoding <encoding>', 'Metadata value encoding: string, json, or hex')
						.option('--ai-model-name <name>', 'Shortcut for metadataKey=modelName')
						.option('--ai-model-provider <provider>', 'AI model provider to store in local profile context')
				)
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent set metadata', mapAgentSetMetadataInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentReferenceOptions(
				withAgentBaseOptions(
					agent.command('set-wallet')
						.description('Prepare or execute an ERC-8004 agent wallet update')
						.option('--new-wallet <address>', 'New agent wallet address')
						.option('--deadline <value>', 'Signature deadline')
						.option('--signature <signature>', 'Agent wallet authorization signature')
				)
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent set wallet', mapAgentSetWalletInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentBaseOptions(
				agent.command('create-token')
					.description('Prepare or execute an agent ERC-20 token deployment')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--name <name>', 'Token name')
					.option('--symbol <symbol>', 'Token symbol')
					.option('--token-symbol <symbol>', 'Alias for --symbol')
					.option('--agent-wallet <address>', 'Wallet that owns/mints the agent token')
					.option('--premint <amount>', 'Human-readable premint amount')
					.option('--decimals <value>', 'Token decimals')
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent create token', mapAgentCreateTokenInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentBaseOptions(
				agent.command('mint')
					.description('Prepare or execute an agent token mint')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--token-address <address>', 'Agent ERC-20 token address')
					.option('--to <address>', 'Recipient wallet address')
					.option('--recipient-address <address>', 'Alias for --to')
					.option('--amount <amount>', 'Human-readable token amount')
					.option('--decimals <value>', 'Token decimals')
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent mint token', mapAgentMintTokenInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentBaseOptions(
				agent.command('burn')
					.description('Prepare or execute an agent token burn')
					.option('--owner-email <email>', 'Tokenizer owner email')
					.option('--email <email>', 'Alias for --owner-email')
					.option('--token-address <address>', 'Agent ERC-20 token address')
					.option('--from <address>', 'Wallet address to burn from')
					.option('--amount <amount>', 'Human-readable token amount')
					.option('--decimals <value>', 'Token decimals')
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent burn token', mapAgentBurnTokenInput);
	});

	const feedback = agent.command('feedback').description('Manage ERC-8004 agent reputation feedback');

	withExecuteOption(
		withFileOption(
			withAgentReferenceOptions(
				withAgentBaseOptions(
					feedback.command('give')
						.description('Prepare or execute ERC-8004 feedback')
						.option('--email <email>', 'Feedback owner email')
						.option('--value <value>', 'Feedback value')
						.option('--value-decimals <value>', 'Feedback value decimals')
						.option('--tag1 <value>', 'Feedback tag 1')
						.option('--tag2 <value>', 'Feedback tag 2')
						.option('--endpoint <url>', 'Service endpoint related to feedback')
						.option('--feedback-uri <uri>', 'Feedback URI')
						.option('--feedback-hash <hash>', '32-byte feedback hash')
				)
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent give feedback', mapAgentGiveFeedbackInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentBaseOptions(
				feedback.command('revoke')
					.description('Prepare or execute ERC-8004 feedback revocation')
					.option('--agent-id <id>', 'On-chain ERC-8004 agent ID')
					.option('--email <email>', 'Feedback owner email')
					.option('--feedback-index <index>', 'Feedback index')
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent revoke feedback', mapAgentRevokeFeedbackInput);
	});

	withExecuteOption(
		withFileOption(
			withAgentBaseOptions(
				feedback.command('respond')
					.description('Prepare or execute an ERC-8004 feedback response')
					.option('--agent-id <id>', 'On-chain ERC-8004 agent ID')
					.option('--email <email>', 'Agent owner email')
					.option('--client-address <address>', 'Original feedback client address')
					.option('--feedback-index <index>', 'Feedback index')
					.option('--response-uri <uri>', 'Response URI')
					.option('--response-hash <hash>', '32-byte response hash')
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent respond to feedback', mapAgentAppendFeedbackResponseInput);
	});
}
