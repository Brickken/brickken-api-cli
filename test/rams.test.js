const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { Wallet, utils } = require('ethers');

const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');
const core = require(path.resolve(__dirname, '..', 'dist', 'internal', 'core'));
const PRINCIPAL_WALLET = Wallet.createRandom();
const PRINCIPAL_PRIVATE_KEY = PRINCIPAL_WALLET.privateKey;
const AGENT_WALLET = Wallet.createRandom();
const AGENT_MANDATE_ADDRESS = '0xD68E1bb972cA4EF7F5764FBf6d685a6DfC26778e';
const COMPLIANCE_PROVIDER_ADDRESS = '0xa90D2503D5D9b80ECC27856Ff76F892B8C02f278';
const ASSET_ADDRESS = '0x000000000000000000000000000000000000beef';
const TRANSFER_FROM_ACTION = `0x23b872dd${'00'.repeat(28)}`;

const GRANT_MANDATE_TYPES = {
	GrantMandate: [
		{ name: 'agent', type: 'address' },
		{ name: 'validFrom', type: 'uint48' },
		{ name: 'validUntil', type: 'uint48' },
		{ name: 'principal', type: 'address' },
		{ name: 'complianceProvider', type: 'address' },
		{ name: 'identityRef', type: 'bytes32' },
		{ name: 'asset', type: 'address' },
		{ name: 'maxTransactionValue', type: 'uint256' },
		{ name: 'maxCumulativeValue', type: 'uint256' },
		{ name: 'metadata', type: 'bytes32' },
		{ name: 'actions', type: 'bytes32[]' },
		{ name: 'nonce', type: 'uint256' },
		{ name: 'deadline', type: 'uint256' }
	]
};

async function createTempWorkspace() {
	return fs.mkdtemp(path.join(os.tmpdir(), 'brickken-cli-rams-test-'));
}

async function writeJsonFile(workspace, fileName, content) {
	const filePath = path.join(workspace, fileName);
	await fs.writeFile(filePath, JSON.stringify(content, null, 2));
	return filePath;
}

async function writeEnvFile(workspace, content = '') {
	const filePath = path.join(workspace, '.env.test');
	await fs.writeFile(filePath, content);
	return filePath;
}

function runCli(args, { cwd, env }) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [CLI_PATH, '--json', ...args], {
			cwd,
			env: {
				...process.env,
				BRICKKEN_API_KEY: '',
				BKN_API_KEY: '',
				BRICKKEN_PRIVATE_KEY: '',
				BKN_PRIVATE_KEY: '',
				BRICKKEN_RPC_URL: '',
				BKN_RPC_URL: '',
				...env
			},
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString('utf8');
		});

		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString('utf8');
		});

		child.on('error', reject);
		child.on('close', (status, signal) => {
			resolve({
				status,
				signal,
				stdout,
				stderr
			});
		});
	});
}

// Generic stub server: `routes` maps '<METHOD> <pathname>' to a response body.
async function startStubServer(routes) {
	const requests = [];

	const server = http.createServer((req, res) => {
		const chunks = [];

		req.on('data', (chunk) => chunks.push(chunk));
		req.on('end', () => {
			const rawBody = Buffer.concat(chunks).toString('utf8');
			const parsedBody = rawBody ? JSON.parse(rawBody) : undefined;
			const url = new URL(req.url, 'http://127.0.0.1');

			requests.push({
				method: req.method,
				url: req.url,
				pathname: url.pathname,
				query: Object.fromEntries(url.searchParams.entries()),
				headers: req.headers,
				body: parsedBody
			});

			const routeKey = `${req.method} ${url.pathname}`;
			if (routes[routeKey]) {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(routes[routeKey]));
				return;
			}

			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'not found' }));
		});
	});

	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();

	return {
		requests,
		baseUrl: `http://127.0.0.1:${address.port}`,
		async close() {
			await new Promise((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		}
	};
}

function buildGrantTypedDataResponse() {
	const domain = {
		name: 'RAMS',
		version: '1',
		chainId: '11155111',
		verifyingContract: AGENT_MANDATE_ADDRESS
	};
	const message = {
		agent: AGENT_WALLET.address,
		validFrom: 0,
		validUntil: 1789000000,
		principal: PRINCIPAL_WALLET.address,
		complianceProvider: COMPLIANCE_PROVIDER_ADDRESS,
		identityRef: `0x${'11'.repeat(32)}`,
		asset: ASSET_ADDRESS,
		maxTransactionValue: '1000000',
		maxCumulativeValue: '5000000',
		metadata: `0x${'00'.repeat(32)}`,
		actions: [TRANSFER_FROM_ACTION],
		nonce: '3',
		deadline: '1752585600'
	};

	return {
		data: {
			chainId: '11155111',
			verifyingContract: AGENT_MANDATE_ADDRESS,
			signer: PRINCIPAL_WALLET.address,
			nonce: '3',
			deadline: '1752585600',
			typedDataId: `0x${'ab'.repeat(32)}`,
			typedData: {
				domain,
				primaryType: 'GrantMandate',
				types: {
					// EIP712Domain is included on purpose: signTypedDataLocally must
					// strip it defensively before handing types to ethers v5.
					EIP712Domain: [
						{ name: 'name', type: 'string' },
						{ name: 'version', type: 'string' },
						{ name: 'chainId', type: 'uint256' },
						{ name: 'verifyingContract', type: 'address' }
					],
					...GRANT_MANDATE_TYPES
				},
				message
			}
		}
	};
}

test('prepareBodyForMethod maps ramsGrantMandate with normalized actions', () => {
	const body = core.prepareBodyForMethod('ramsGrantMandate', {
		chain: '11155111',
		signerAddress: PRINCIPAL_WALLET.address,
		agent: AGENT_WALLET.address,
		principal: PRINCIPAL_WALLET.address,
		validUntil: '1789000000',
		identityRef: `0x${'11'.repeat(32)}`,
		asset: ASSET_ADDRESS,
		maxTransactionValue: '1000000',
		maxCumulativeValue: 'max',
		actions: '0x23b872dd,0xa9059cbb',
		signature: '0xsig',
		deadline: '1752585600',
		executionMode: 'brickken-relayed',
		mandateAddress: AGENT_MANDATE_ADDRESS
	});

	assert.equal(body.method, 'ramsGrantMandate');
	assert.equal(body.chainId, 'aa36a7');
	assert.deepEqual(body.actions, ['0x23b872dd', '0xa9059cbb']);
	assert.equal(body.agent, AGENT_WALLET.address);
	assert.equal(body.principal, PRINCIPAL_WALLET.address);
	assert.equal(body.maxCumulativeValue, 'max');
	// Signed lifecycle ops keep executionMode.
	assert.equal(body.executionMode, 'brickken-relayed');
	assert.equal(body.signature, '0xsig');
	assert.equal(body.deadline, '1752585600');
	// --mandate-address is remapped to the canonical field.
	assert.equal(body.agentMandateAddress, AGENT_MANDATE_ADDRESS);
	assert.equal('mandateAddress' in body, false);
});

test('mapRamsExecuteInput strips executionMode from the prepare body', () => {
	const body = core.mapRamsExecuteInput({
		chain: '11155111',
		signerAddress: AGENT_WALLET.address,
		target: ASSET_ADDRESS,
		data: '0x23b872dd',
		executionMode: 'brickken-relayed'
	});

	assert.equal(body.method, 'ramsExecute');
	assert.equal(body.target, ASSET_ADDRESS);
	assert.equal(body.data, '0x23b872dd');
	assert.equal('executionMode' in body, false);
});

test('normalizeRamsActions accepts arrays, comma-separated strings, and mixes', () => {
	assert.deepEqual(core.normalizeRamsActions('0x23b872dd'), ['0x23b872dd']);
	assert.deepEqual(core.normalizeRamsActions('0x23b872dd, 0xa9059cbb'), ['0x23b872dd', '0xa9059cbb']);
	assert.deepEqual(core.normalizeRamsActions(['0x23b872dd', `${TRANSFER_FROM_ACTION},0xa9059cbb`]), [
		'0x23b872dd',
		TRANSFER_FROM_ACTION,
		'0xa9059cbb'
	]);
	assert.equal(core.normalizeRamsActions(undefined), undefined);
	assert.equal(core.normalizeRamsActions([]), undefined);
});

test('signTypedDataLocally rejects a private key that does not match the expected signer', async () => {
	const response = buildGrantTypedDataResponse();

	await assert.rejects(
		core.signTypedDataLocally(response.data.typedData, AGENT_WALLET.privateKey, PRINCIPAL_WALLET.address),
		/does not match expected signer/i
	);
});

test('rams grant prepares a ramsGrantMandate body with normalized chainId and actions', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const server = await startStubServer({
		'POST /prepare-transactions': {
			txId: '0xrams-grant',
			transactions: {
				from: PRINCIPAL_WALLET.address,
				to: AGENT_MANDATE_ADDRESS,
				data: '0x1234',
				value: '0x0',
				nonce: 1,
				chainId: 11155111,
				type: 2,
				gasLimit: '0x5208'
			},
			info: { mode: 'direct', eip712Nonce: '3' }
		}
	});

	try {
		const result = await runCli(
			[
				'rams',
				'grant',
				'--chain',
				'11155111',
				'--signer-address',
				PRINCIPAL_WALLET.address,
				'--agent',
				AGENT_WALLET.address,
				'--principal',
				PRINCIPAL_WALLET.address,
				'--valid-until',
				'1789000000',
				'--identity-ref',
				`0x${'11'.repeat(32)}`,
				'--asset',
				ASSET_ADDRESS,
				'--max-transaction-value',
				'1000000',
				'--max-cumulative-value',
				'5000000',
				'--action',
				'0x23b872dd',
				'--action',
				'0xa9059cbb',
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{ cwd: workspace, env: {} }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].pathname, '/prepare-transactions');

		const body = server.requests[0].body;
		assert.equal(body.method, 'ramsGrantMandate');
		assert.equal(body.chainId, 'aa36a7');
		assert.deepEqual(body.actions, ['0x23b872dd', '0xa9059cbb']);
		assert.equal(body.agent, AGENT_WALLET.address);
		assert.equal(body.principal, PRINCIPAL_WALLET.address);
		assert.equal(body.validUntil, '1789000000');
		assert.equal(body.maxTransactionValue, '1000000');
		assert.equal(body.maxCumulativeValue, '5000000');
		assert.equal(body.signerAddress, PRINCIPAL_WALLET.address);
		// No signature flags passed: direct mode, no executionMode.
		assert.equal('executionMode' in body, false);
		assert.equal('signature' in body, false);

		const output = JSON.parse(result.stdout);
		assert.equal(output.txId, '0xrams-grant');
		assert.equal(output.info.eip712Nonce, '3');
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('rams relayed lifecycle omits signerAddress and sends the prepared call without local tx signing', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const server = await startStubServer({
		'POST /prepare-transactions': {
			txId: '0xrams-relayed',
			transactions: {
				from: '0x1111111111111111111111111111111111111111',
				to: AGENT_MANDATE_ADDRESS,
				data: '0x1234',
				value: '0x0'
			}
		},
		'POST /send-transactions': { success: true }
	});

	try {
		const result = await runCli(
			[
				'rams',
				'revoke',
				'--chain',
				'11155111',
				'--agent',
				AGENT_WALLET.address,
				'--principal',
				PRINCIPAL_WALLET.address,
				'--signature',
				`0x${'11'.repeat(65)}`,
				'--deadline',
				'1789000000',
				'--execution-mode',
				'brickken-relayed',
				'--execute',
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{ cwd: workspace, env: { BRICKKEN_PRIVATE_KEY: AGENT_WALLET.privateKey } }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 2);
		assert.equal(server.requests[0].body.method, 'ramsRevokeMandate');
		assert.equal(server.requests[0].body.signerAddress, undefined);
		assert.equal(server.requests[0].body.executionMode, 'brickken-relayed');
		assert.deepEqual(server.requests[1].body, {
			txId: '0xrams-relayed',
			transactions: [{ to: AGENT_MANDATE_ADDRESS, data: '0x1234', value: '0x0' }]
		});
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('rams execute drops executionMode coming from a --file payload', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const inputFile = await writeJsonFile(workspace, 'execute.json', {
		chainId: '11155111',
		signerAddress: AGENT_WALLET.address,
		asset: ASSET_ADDRESS,
		from: PRINCIPAL_WALLET.address,
		to: AGENT_WALLET.address,
		amount: '2500',
		executionMode: 'brickken-relayed'
	});
	const server = await startStubServer({
		'POST /prepare-transactions': {
			txId: '0xrams-execute',
			transactions: {
				from: AGENT_WALLET.address,
				to: '0xc81949Cf5b52BDc7890Fd5040A9Cd0cdb4B59952',
				data: '0x1234',
				value: '0x0',
				nonce: 2,
				chainId: 11155111,
				type: 2,
				gasLimit: '0x5208'
			}
		}
	});

	try {
		const result = await runCli(
			['rams', 'execute', '--file', inputFile, '--env-file', envFile, '--base-url', server.baseUrl],
			{ cwd: workspace, env: {} }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);

		const body = server.requests[0].body;
		assert.equal(body.method, 'ramsExecute');
		assert.equal(body.chainId, 'aa36a7');
		assert.equal(body.asset, ASSET_ADDRESS);
		assert.equal(body.from, PRINCIPAL_WALLET.address);
		assert.equal(body.to, AGENT_WALLET.address);
		assert.equal(body.amount, '2500');
		// ramsExecute can never be relayed: a stray executionMode must be stripped.
		assert.equal('executionMode' in body, false);
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('rams inspect issues a GET /rams/mandate with the expected query string', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const server = await startStubServer({
		'GET /rams/mandate': {
			data: {
				chainId: '11155111',
				agentMandateAddress: AGENT_MANDATE_ADDRESS,
				agent: AGENT_WALLET.address,
				principal: PRINCIPAL_WALLET.address,
				mandate: null,
				status: 'none',
				frozen: false,
				nonce: '0'
			}
		}
	});

	try {
		const result = await runCli(
			[
				'rams',
				'inspect',
				'--chain',
				'11155111',
				'--agent',
				AGENT_WALLET.address,
				'--principal',
				PRINCIPAL_WALLET.address,
				'--mandate-address',
				AGENT_MANDATE_ADDRESS,
				'--env-file',
				envFile,
				'--api-key',
				'rams-read-key',
				'--base-url',
				server.baseUrl
			],
			{ cwd: workspace, env: {} }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].method, 'GET');
		assert.equal(server.requests[0].pathname, '/rams/mandate');
		assert.equal(server.requests[0].headers['x-api-key'], 'rams-read-key');
		assert.deepEqual(server.requests[0].query, {
			chainId: 'aa36a7',
			agent: AGENT_WALLET.address,
			principal: PRINCIPAL_WALLET.address,
			agentMandateAddress: AGENT_MANDATE_ADDRESS
		});

		const output = JSON.parse(result.stdout);
		assert.equal(output.data.status, 'none');
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('rams reads fail before issuing a request when no API key is configured', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);

	try {
		const result = await runCli(
			[
				'rams',
				'status',
				'--chain',
				'11155111',
				'--agent',
				AGENT_WALLET.address,
				'--principal',
				PRINCIPAL_WALLET.address,
				'--env-file',
				envFile,
				'--base-url',
				'http://127.0.0.1:1'
			],
			{ cwd: workspace, env: {} }
		);

		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /Brickken API key is required/i);
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('rams sign fetches typed data, signs locally, and the signature recovers to the principal', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const typedDataResponse = buildGrantTypedDataResponse();
	const server = await startStubServer({
		'GET /rams/typed-data/grant-mandate': typedDataResponse
	});

	try {
		const result = await runCli(
			[
				'rams',
				'sign',
				'--operation',
				'grant-mandate',
				'--chain',
				'11155111',
				'--agent',
				AGENT_WALLET.address,
				'--principal',
				PRINCIPAL_WALLET.address,
				'--valid-until',
				'1789000000',
				'--identity-ref',
				`0x${'11'.repeat(32)}`,
				'--asset',
				ASSET_ADDRESS,
				'--max-transaction-value',
				'1000000',
				'--max-cumulative-value',
				'5000000',
				'--action',
				'0x23b872dd',
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{
				cwd: workspace,
				env: {
					BRICKKEN_API_KEY: 'rams-typed-data-key',
					BRICKKEN_PRIVATE_KEY: PRINCIPAL_PRIVATE_KEY
				}
			}
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].method, 'GET');
		assert.equal(server.requests[0].pathname, '/rams/typed-data/grant-mandate');
		assert.equal(server.requests[0].headers['x-api-key'], 'rams-typed-data-key');
		assert.equal(server.requests[0].query.chainId, 'aa36a7');
		assert.equal(server.requests[0].query.agent, AGENT_WALLET.address);
		assert.equal(server.requests[0].query.principal, PRINCIPAL_WALLET.address);
		assert.equal(server.requests[0].query.validUntil, '1789000000');
		assert.equal(server.requests[0].query.actions, '0x23b872dd');

		const output = JSON.parse(result.stdout);
		assert.equal(output.signerAddress, PRINCIPAL_WALLET.address);
		assert.equal(output.deadline, '1752585600');
		assert.equal(output.nonce, '3');
		assert.equal(output.typedDataId, `0x${'ab'.repeat(32)}`);
		assert.ok(output.typedData);

		const envelope = typedDataResponse.data.typedData;
		const recovered = utils.verifyTypedData(
			envelope.domain,
			GRANT_MANDATE_TYPES,
			envelope.message,
			output.signature
		);
		assert.equal(recovered, PRINCIPAL_WALLET.address);
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('rams sign fails when the private key does not match the typed-data signer', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const server = await startStubServer({
		'GET /rams/typed-data/grant-mandate': buildGrantTypedDataResponse()
	});

	try {
		const result = await runCli(
			[
				'rams',
				'sign',
				'--operation',
				'grant-mandate',
				'--chain',
				'11155111',
				'--agent',
				AGENT_WALLET.address,
				'--principal',
				PRINCIPAL_WALLET.address,
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{
				cwd: workspace,
				env: {
					BRICKKEN_API_KEY: 'rams-typed-data-key',
					BRICKKEN_PRIVATE_KEY: AGENT_WALLET.privateKey
				}
			}
		);

		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /does not match expected signer/i);
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('rams sign --typed-data-file signs a saved envelope offline', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const typedDataResponse = buildGrantTypedDataResponse();
	const typedDataFile = await writeJsonFile(workspace, 'typed-data.json', typedDataResponse);

	try {
		const result = await runCli(
			['rams', 'sign', '--typed-data-file', typedDataFile, '--env-file', envFile],
			{
				cwd: workspace,
				env: { BRICKKEN_PRIVATE_KEY: PRINCIPAL_PRIVATE_KEY }
			}
		);

		assert.equal(result.status, 0, result.stderr);

		const output = JSON.parse(result.stdout);
		assert.equal(output.signerAddress, PRINCIPAL_WALLET.address);
		assert.equal(output.nonce, '3');

		const envelope = typedDataResponse.data.typedData;
		const recovered = utils.verifyTypedData(
			envelope.domain,
			GRANT_MANDATE_TYPES,
			envelope.message,
			output.signature
		);
		assert.equal(recovered, PRINCIPAL_WALLET.address);
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
});
