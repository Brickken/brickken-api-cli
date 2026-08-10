import { Command } from 'commander';
import {
	mapAgentAppendFeedbackResponseInput,
	mapAgentGiveFeedbackInput,
	mapAgentRegisterInput,
	mapAgentRevokeFeedbackInput,
	mapAgentSetMetadataInput,
	mapAgentSetUriInput,
	mapAgentSetWalletInput,
	mapAgentTransferOwnershipInput
} from '../internal/core';
import {
	collectValues,
	runInfoCommand,
	runPrepareCommand,
	withExecuteOption,
	withExecutionModeOption,
	withFileOption
} from './shared';
import { normalizeChainId } from '../cli-config';

type Mapper = (input: Record<string, any>) => Record<string, any>;

function withAgentBaseOptions(command: Command): Command {
	return withExecutionModeOption(
		command
			.option('--chain <chain>', 'Chain identifier')
			.option('--signer-address <address>', 'Signer wallet address')
			.option('--gas-limit <value>', 'Optional explicit gas limit')
	);
}

function withAgentReferenceOptions(command: Command): Command {
	return command
		.option('--agent-uuid <uuid>', 'Stored tokenized agent UUID')
		.option('--agent-id <id>', 'On-chain ERC-8004 agent ID');
}

function withAgentReadReferenceOptions(command: Command): Command {
	return withAgentReferenceOptions(command)
		.option('--chain <chain>', 'Chain identifier (required with --agent-id)');
}

function withAgentPaginationOptions(command: Command): Command {
	return command
		.option('--limit <value>', 'Maximum results to return (1-100)')
		.option('--offset <value>', 'Number of results to skip');
}

function buildAgentReferenceQuery(input: Record<string, any>): Record<string, any> {
	if (input.agentUuid) return { agentUuid: input.agentUuid };
	if (!input.agentId) throw new Error('Either --agent-uuid or --agent-id is required');
	if (!input.chain && !input.chainId) throw new Error('--chain is required with --agent-id');
	return {
		agentId: input.agentId,
		chainId: normalizeChainId(input.chainId || input.chain)
	};
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
		.description('Manage ERC-8004 agent identity and reputation');

	withAgentPaginationOptions(
		agent.command('list')
			.description('List API-scoped agents with API key or owner-scoped agents through x402')
			.option('--chain <chain>', 'Optional chain filter; required for x402')
			.option('--owner-wallet-address <address>', 'Optional owner filter; required for x402')
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'Agents',
			path: '/get-agents',
			supportsX402: true,
			buildQuery: input => ({
				chainId: input.chain ? normalizeChainId(input.chain) : undefined,
				ownerWalletAddress: input.ownerWalletAddress,
				limit: input.limit,
				offset: input.offset
			})
		});
	});

	withAgentReadReferenceOptions(
		agent.command('info')
			.description('Get a complete agent profile by UUID or on-chain ID')
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'Agent info',
			path: '/get-agent-info',
			supportsX402: true,
			buildQuery: buildAgentReferenceQuery
		});
	});

	withAgentPaginationOptions(
		withAgentReadReferenceOptions(
			agent.command('transactions')
				.description('List ERC-8004, agent-token, and RAMS transactions for an agent')
		)
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'Agent transactions',
			path: '/get-agent-transactions',
			supportsX402: true,
			buildQuery: input => ({
				...buildAgentReferenceQuery(input),
				limit: input.limit,
				offset: input.offset
			})
		});
	});

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
			withAgentReferenceOptions(
				withAgentBaseOptions(
					agent.command('transfer-ownership')
						.description('Prepare or execute an ERC-8004 agent ownership transfer')
						.option('--new-owner <address>', 'New owner wallet address')
				)
			)
		)
	).action(async (options, command) => {
		await runAgentPrepare(command, options, 'Agent transfer ownership', mapAgentTransferOwnershipInput);
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
