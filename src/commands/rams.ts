import { Command, Option } from 'commander';
import { readStructuredFile } from '../files';
import {
	mapRamsExecuteInput,
	mapRamsExtendMandateInput,
	mapRamsFreezeAgentInput,
	mapRamsGrantMandateInput,
	mapRamsGrantPrincipalInput,
	mapRamsRevokeMandateInput,
	mapRamsRevokePrincipalInput,
	mapRamsSetExecutorActionInput,
	mapRamsSetOperatorInput,
	mapRamsUnfreezeAgentInput,
	normalizeChainId,
	normalizeRamsActions,
	requestJson,
	signTypedDataLocally
} from '../internal/core';
import { resolveCliConfig } from '../cli-config';
import { printResult } from '../output';
import {
	buildCommandInput,
	collectValues,
	runInfoCommand,
	runPrepareCommand,
	withExecuteOption,
	withExecutionModeOption,
	withFileOption
} from './shared';

const RAMS_READ_AUTH_NOTE = 'Requires a Brickken API key on the backend; x402 does not cover read endpoints.';

const RAMS_SIGN_OPERATIONS = ['grant-mandate', 'revoke-mandate', 'extend-mandate', 'set-operator'];

function withRamsBaseOptions(command: Command): Command {
	return command
		.option('--chain <chain>', 'Chain identifier')
		.option('--signer-address <address>', 'Signer wallet address')
		.option('--gas-limit <value>', 'Optional explicit gas limit')
		.option('--mandate-address <address>', 'AgentMandate contract address override');
}

function withRamsSignatureOptions(command: Command): Command {
	return withExecutionModeOption(
		command
			.option('--signature <hex>', 'Principal EIP-712 signature (omit for direct mode)')
			.option('--deadline <unixSeconds>', 'Signature deadline in Unix seconds (required with --signature)')
	);
}

function withRamsReadBaseOptions(command: Command): Command {
	return command
		.option('--chain <chain>', 'Chain identifier')
		.option('--mandate-address <address>', 'AgentMandate contract address override');
}

function buildRamsTypedDataQuery(input: Record<string, any>): Record<string, any> {
	const actions = normalizeRamsActions(input.actions || input.action);
	return {
		chainId: normalizeChainId(input.chainId || input.chain),
		agent: input.agent,
		principal: input.principal,
		validFrom: input.validFrom,
		validUntil: input.validUntil,
		complianceProvider: input.complianceProvider,
		identityRef: input.identityRef,
		asset: input.asset,
		maxTransactionValue: input.maxTransactionValue,
		maxCumulativeValue: input.maxCumulativeValue,
		metadata: input.metadata,
		actions: actions ? actions.join(',') : undefined,
		newValidUntil: input.newValidUntil,
		operator: input.operator,
		approved: input.approved,
		deadline: input.deadline,
		agentMandateAddress: input.agentMandateAddress || input.mandateAddress
	};
}

async function runRamsSignCommand(options: Record<string, any>, command: Command): Promise<void> {
	const config = resolveCliConfig(command);

	if (!config.privateKey) {
		throw new Error(
			'A private key is required for rams sign. Set BKN_PRIVATE_KEY or BRICKKEN_PRIVATE_KEY, or pass --private-key.'
		);
	}

	let envelope: Record<string, any>;
	if (options.typedDataFile) {
		const fileContent = await readStructuredFile(options.typedDataFile);
		envelope = fileContent?.data?.typedData ? fileContent.data : fileContent;
	} else {
		if (!options.operation) {
			throw new Error(
				`--operation is required unless --typed-data-file is provided. Valid operations: ${RAMS_SIGN_OPERATIONS.join(', ')}.`
			);
		}

		const input = await buildCommandInput(options, ['file', 'execute', 'operation', 'typedDataFile']);
		const response = await requestJson<any>(config, {
			method: 'GET',
			path: `/rams/typed-data/${options.operation}`,
			apiKeyAuth: true,
			query: buildRamsTypedDataQuery(input)
		});
		envelope = response?.data?.typedData ? response.data : response;
	}

	const typedData = envelope?.typedData || envelope;
	if (!typedData?.domain || !typedData?.types || !typedData?.message) {
		throw new Error('Typed-data payload must include domain, types, and message');
	}

	const { signerAddress, signature } = await signTypedDataLocally(
		typedData,
		config.privateKey,
		envelope.signer
	);

	printResult(
		{
			signature,
			signerAddress,
			deadline: envelope.deadline ?? typedData.message?.deadline,
			nonce: envelope.nonce ?? typedData.message?.nonce,
			typedDataId: envelope.typedDataId,
			typedData
		},
		config,
		'RAMS typed-data sign'
	);
}

export function registerRamsCommands(program: Command): void {
	const rams = program
		.command('rams')
		.description('Manage ERC-8226 RAMS mandates (compliance-gated delegated agent authority)');

	withExecuteOption(
		withFileOption(
			withRamsSignatureOptions(
				withRamsBaseOptions(
					rams.command('grant')
						.description('Prepare or execute a RAMS grantMandate (direct signer: the principal; or any relayer with a principal signature)')
						.option('--agent <address>', 'Agent wallet address')
						.option('--principal <address>', 'Principal wallet address')
						.option('--valid-from <unixSeconds>', 'Mandate validity start (default: immediately)')
						.option('--valid-until <unixSeconds>', 'Mandate validity end')
						.option('--compliance-provider <address>', 'Compliance provider address (default: Brickken provider)')
						.option('--identity-ref <bytes32>', 'Compliance identity reference')
						.option('--asset <address>', 'Asset address the mandate covers')
						.option('--max-transaction-value <value>', 'Per-transaction cap in raw base units ("max" for unlimited)')
						.option('--max-cumulative-value <value>', 'Cumulative cap in raw base units ("max" for unlimited)')
						.option('--metadata <bytes32>', 'Optional bytes32 mandate metadata')
						.option('--action <value>', 'Allowed bytes32 action or 4-byte selector (repeatable)', collectValues, [])
						.option('--owner-email <email>', 'Attribution owner email')
						.option('--email <email>', 'Alias for --owner-email')
				)
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS grant mandate',
			mapInput: mapRamsGrantMandateInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsSignatureOptions(
				withRamsBaseOptions(
					rams.command('revoke')
						.description('Prepare or execute a RAMS revokeMandate (direct signer: principal or approved operator)')
						.option('--agent <address>', 'Agent wallet address')
						.option('--principal <address>', 'Principal wallet address')
				)
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS revoke mandate',
			mapInput: mapRamsRevokeMandateInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsSignatureOptions(
				withRamsBaseOptions(
					rams.command('extend')
						.description('Prepare or execute a RAMS extendMandate (direct signer: principal or approved operator)')
						.option('--agent <address>', 'Agent wallet address')
						.option('--principal <address>', 'Principal wallet address')
						.option('--new-valid-until <unixSeconds>', 'New mandate validity end (must exceed the current one)')
				)
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS extend mandate',
			mapInput: mapRamsExtendMandateInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsSignatureOptions(
				withRamsBaseOptions(
					rams.command('set-operator')
						.description('Prepare or execute a RAMS setOperator (direct signer: the principal)')
						.option('--principal <address>', 'Principal wallet address')
						.option('--operator <address>', 'Operator wallet address')
						.option('--approved <true|false>', 'Whether the operator is approved')
				)
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS set operator',
			mapInput: mapRamsSetOperatorInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsBaseOptions(
				rams.command('execute')
					.description('Prepare or execute a RAMS AgentExecutor call (signer: the agent; never brickken-relayed)')
					.option('--target <address>', 'Raw mode: contract the executor will call')
					.option('--data <hex>', 'Raw mode: full inner calldata (at least 4 bytes)')
					.option('--asset <address>', 'Transfer mode: ERC-20 asset address')
					.option('--from <address>', 'Transfer mode: token holder (normally the executor principal)')
					.option('--to <address>', 'Transfer mode: recipient address')
					.option('--amount <value>', 'Transfer mode: amount in raw base units')
					.option('--executor-address <address>', 'AgentExecutor contract address override')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS execute',
			mapInput: mapRamsExecuteInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsBaseOptions(
				rams.command('set-action')
					.description('Prepare or execute a RAMS setAction on the executor (signer: the executor owner; never brickken-relayed)')
					.option('--selector <selector>', '4-byte function selector, e.g. 0x23b872dd')
					.option('--action <bytes32>', 'Left-aligned bytes32 action (alternative to --selector)')
					.option('--supported <true|false>', 'Whether the selector is supported')
					.option('--has-amount <true|false>', 'Whether the calldata carries an amount to gate')
					.option('--amount-index <n>', 'Zero-based word index of the amount argument (required with --has-amount true)')
					.option('--executor-address <address>', 'AgentExecutor contract address override')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS set executor action',
			mapInput: mapRamsSetExecutorActionInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsBaseOptions(
				rams.command('freeze')
					.description('Prepare or execute a RAMS freezeAgent (signer: an ENFORCER_ROLE holder; never brickken-relayed)')
					.option('--agent <address>', 'Agent wallet address')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS freeze agent',
			mapInput: mapRamsFreezeAgentInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsBaseOptions(
				rams.command('unfreeze')
					.description('Prepare or execute a RAMS unfreezeAgent (signer: an ENFORCER_ROLE holder; never brickken-relayed)')
					.option('--agent <address>', 'Agent wallet address')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS unfreeze agent',
			mapInput: mapRamsUnfreezeAgentInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsBaseOptions(
				rams.command('grant-principal')
					.description('Prepare or execute a compliance grantPrincipal (signer: the compliance provider owner; never brickken-relayed)')
					.option('--principal <address>', 'Principal wallet address')
					.option('--identity-ref <bytes32>', 'Non-zero compliance identity reference')
					.option('--expires-at <unixSeconds>', 'Eligibility expiry (default: no expiry)')
					.option('--compliance-provider-address <address>', 'ComplianceProvider contract address override')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS grant principal',
			mapInput: mapRamsGrantPrincipalInput
		});
	});

	withExecuteOption(
		withFileOption(
			withRamsBaseOptions(
				rams.command('revoke-principal')
					.description('Prepare or execute a compliance revokePrincipal (signer: the compliance provider owner; never brickken-relayed)')
					.option('--principal <address>', 'Principal wallet address')
					.option('--reason <value>', 'Revocation reason name (e.g. KYC_EXPIRED) or code 0-8')
					.option('--compliance-provider-address <address>', 'ComplianceProvider contract address override')
			)
		)
	).action(async (options, command) => {
		await runPrepareCommand({
			command,
			options,
			label: 'RAMS revoke principal',
			mapInput: mapRamsRevokePrincipalInput
		});
	});

	withRamsReadBaseOptions(
		rams.command('inspect')
			.description(`Inspect a mandate via GET /rams/mandate. ${RAMS_READ_AUTH_NOTE}`)
			.option('--agent <address>', 'Agent wallet address')
			.option('--principal <address>', 'Principal wallet address')
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'RAMS mandate',
			path: '/rams/mandate',
			requiresApiKey: true,
			buildQuery: (input) => ({
				chainId: normalizeChainId(input.chainId || input.chain),
				agent: input.agent,
				principal: input.principal,
				agentMandateAddress: input.agentMandateAddress || input.mandateAddress
			})
		});
	});

	withRamsReadBaseOptions(
		rams.command('can-execute')
			.description(`Check whether an execution would be allowed via GET /rams/can-execute. ${RAMS_READ_AUTH_NOTE}`)
			.option('--agent <address>', 'Agent wallet address')
			.option('--principal <address>', 'Principal wallet address')
			.option('--asset <address>', 'Asset address')
			.option('--amount <value>', 'Amount in raw base units (default 0)')
			.option('--action <bytes32>', 'bytes32 action to check')
			.option('--selector <selector>', '4-byte selector to check (alternative to --action)')
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'RAMS can-execute',
			path: '/rams/can-execute',
			requiresApiKey: true,
			buildQuery: (input) => ({
				chainId: normalizeChainId(input.chainId || input.chain),
				agent: input.agent,
				principal: input.principal,
				asset: input.asset,
				amount: input.amount,
				action: input.action,
				selector: input.selector,
				agentMandateAddress: input.agentMandateAddress || input.mandateAddress
			})
		});
	});

	withRamsReadBaseOptions(
		rams.command('status')
			.description(`Get freeze status, EIP-712 nonce, and operator approval via GET /rams/status. ${RAMS_READ_AUTH_NOTE}`)
			.option('--agent <address>', 'Agent wallet address')
			.option('--principal <address>', 'Principal wallet address')
			.option('--operator <address>', 'Optional operator address to check')
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'RAMS status',
			path: '/rams/status',
			requiresApiKey: true,
			buildQuery: (input) => ({
				chainId: normalizeChainId(input.chainId || input.chain),
				agent: input.agent,
				principal: input.principal,
				operator: input.operator,
				agentMandateAddress: input.agentMandateAddress || input.mandateAddress
			})
		});
	});

	withRamsReadBaseOptions(
		rams.command('compliance-status')
			.description(`Check principal compliance eligibility via GET /rams/compliance-status. ${RAMS_READ_AUTH_NOTE}`)
			.option('--principal <address>', 'Principal wallet address')
			.option('--identity-ref <bytes32>', 'Compliance identity reference')
			.option('--compliance-provider-address <address>', 'ComplianceProvider contract address override')
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'RAMS compliance status',
			path: '/rams/compliance-status',
			requiresApiKey: true,
			buildQuery: (input) => ({
				chainId: normalizeChainId(input.chainId || input.chain),
				principal: input.principal,
				identityRef: input.identityRef,
				complianceProviderAddress: input.complianceProviderAddress
			})
		});
	});

	withRamsReadBaseOptions(
		rams.command('executor-action')
			.description(`Get an executor action spec via GET /rams/executor-action. ${RAMS_READ_AUTH_NOTE}`)
			.option('--selector <selector>', '4-byte function selector')
			.option('--action <bytes32>', 'Left-aligned bytes32 action (alternative to --selector)')
			.option('--executor-address <address>', 'AgentExecutor contract address override')
	).action(async (options, command) => {
		await runInfoCommand({
			command,
			options,
			label: 'RAMS executor action',
			path: '/rams/executor-action',
			requiresApiKey: true,
			buildQuery: (input) => ({
				chainId: normalizeChainId(input.chainId || input.chain),
				selector: input.selector,
				action: input.action,
				executorAddress: input.executorAddress
			})
		});
	});

	withFileOption(
		rams.command('sign')
			.description('Fetch RAMS EIP-712 typed data and sign it locally with the configured private key')
			.addOption(
				new Option('--operation <operation>', 'Typed-data operation to fetch and sign')
					.choices(RAMS_SIGN_OPERATIONS)
			)
			.option('--typed-data-file <path>', 'Sign a previously saved typed-data envelope offline (skips the GET)')
			.option('--chain <chain>', 'Chain identifier')
			.option('--mandate-address <address>', 'AgentMandate contract address override')
			.option('--agent <address>', 'Agent wallet address')
			.option('--principal <address>', 'Principal wallet address')
			.option('--valid-from <unixSeconds>', 'grant-mandate: validity start')
			.option('--valid-until <unixSeconds>', 'grant-mandate: validity end')
			.option('--compliance-provider <address>', 'grant-mandate: compliance provider address')
			.option('--identity-ref <bytes32>', 'grant-mandate: compliance identity reference')
			.option('--asset <address>', 'grant-mandate: asset address')
			.option('--max-transaction-value <value>', 'grant-mandate: per-transaction cap in raw base units')
			.option('--max-cumulative-value <value>', 'grant-mandate: cumulative cap in raw base units')
			.option('--metadata <bytes32>', 'grant-mandate: optional bytes32 metadata')
			.option('--action <value>', 'grant-mandate: allowed bytes32 action or 4-byte selector (repeatable)', collectValues, [])
			.option('--new-valid-until <unixSeconds>', 'extend-mandate: new validity end')
			.option('--operator <address>', 'set-operator: operator address')
			.option('--approved <true|false>', 'set-operator: approval flag')
			.option('--deadline <unixSeconds>', 'Requested signature deadline (default: server-side now + 1 hour)')
	).action(async (options, command) => {
		await runRamsSignCommand(options, command);
	});
}
