const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { Wallet } = require('ethers');

const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');
const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945382d7d8b2f8d96f7f9b08d2f4f6f5f9d8f7';
const TEST_WALLET = new Wallet(TEST_PRIVATE_KEY);
const ALT_PRIVATE_KEY = '0x8b3a350cf5c34c9194ca3a545d79b0f8de8d90c5f6f2a444ef322a32956543b6';
const ALT_WALLET = new Wallet(ALT_PRIVATE_KEY);

function buildTransaction({ nonce, from = TEST_WALLET.address }) {
	return {
		from,
		to: '0x000000000000000000000000000000000000dead',
		value: '0x00',
		nonce,
		chainId: 11155111,
		data: '0x1234',
		type: 2,
		maxPriorityFeePerGas: '0x3b9aca00',
		maxFeePerGas: '0x77359400',
		gasLimit: '0x5208'
	};
}

async function createTempWorkspace() {
	return fs.mkdtemp(path.join(os.tmpdir(), 'brickken-cli-test-'));
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

async function startMockServer({ preparedResponse, sendResponse }) {
	const requests = [];

	const server = http.createServer((req, res) => {
		const chunks = [];

		req.on('data', (chunk) => chunks.push(chunk));
		req.on('end', () => {
			const rawBody = Buffer.concat(chunks).toString('utf8');
			const parsedBody = rawBody ? JSON.parse(rawBody) : undefined;

			requests.push({
				method: req.method,
				url: req.url,
				headers: req.headers,
				body: parsedBody
			});

			if (req.method === 'POST' && req.url === '/prepare-transactions') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(preparedResponse));
				return;
			}

			if (req.method === 'POST' && req.url === '/send-transactions') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(sendResponse));
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

test('top-level create-token prepares createToken and ignores API key environment variables', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace, 'BRICKKEN_API_KEY=from-env-file\nBKN_API_KEY=also-ignored\n');
	const server = await startMockServer({
		preparedResponse: {
			txId: '0xcreate-token',
			transactions: buildTransaction({ nonce: 10 })
		},
		sendResponse: { success: true }
	});

	try {
		const result = await runCli(
			[
				'create-token',
				'--chain',
				'11155111',
				'--owner-email',
				'owner@example.com',
				'--signer-address',
				TEST_WALLET.address,
				'--name',
				'Research Agent Token',
				'--symbol',
				'RAGT',
				'--agent-wallet',
				TEST_WALLET.address,
				'--premint',
				'1000',
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{
				cwd: workspace,
				env: {
					BRICKKEN_API_KEY: 'from-process-env',
					BKN_API_KEY: 'also-from-process-env'
				}
			}
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].url, '/prepare-transactions');
		assert.equal(server.requests[0].headers['x-api-key'], undefined);
		assert.equal(server.requests[0].body.method, 'createToken');
		assert.equal(server.requests[0].body.chainId, 'aa36a7');
		assert.equal(server.requests[0].body.ownerEmail, 'owner@example.com');
		assert.equal(server.requests[0].body.symbol, 'RAGT');
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('top-level mint prepares mintToken', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const server = await startMockServer({
		preparedResponse: {
			txId: '0xmint-token',
			transactions: buildTransaction({ nonce: 11 })
		},
		sendResponse: { success: true }
	});

	try {
		const result = await runCli(
			[
				'mint',
				'--chain',
				'11155111',
				'--owner-email',
				'owner@example.com',
				'--signer-address',
				TEST_WALLET.address,
				'--token-address',
				'0x000000000000000000000000000000000000beef',
				'--to',
				TEST_WALLET.address,
				'--amount',
				'100',
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{ cwd: workspace, env: {} }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].body.method, 'mintToken');
		assert.equal(server.requests[0].body.to, TEST_WALLET.address);
		assert.equal(server.requests[0].body.amount, '100');
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('top-level burn prepares burnToken', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const server = await startMockServer({
		preparedResponse: {
			txId: '0xburn-token',
			transactions: buildTransaction({ nonce: 12 })
		},
		sendResponse: { success: true }
	});

	try {
		const result = await runCli(
			[
				'burn',
				'--chain',
				'11155111',
				'--owner-email',
				'owner@example.com',
				'--signer-address',
				TEST_WALLET.address,
				'--token-address',
				'0x000000000000000000000000000000000000beef',
				'--from',
				TEST_WALLET.address,
				'--amount',
				'25',
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{ cwd: workspace, env: {} }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].body.method, 'burnToken');
		assert.equal(server.requests[0].body.from, TEST_WALLET.address);
		assert.equal(server.requests[0].body.amount, '25');
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('legacy command groups and old agent economics aliases are unavailable', async () => {
	const workspace = await createTempWorkspace();

	try {
		for (const commandName of ['tokenization', 'sto', 'token', 'info']) {
			const result = await runCli([commandName, 'removed'], { cwd: workspace, env: {} });
			assert.notEqual(result.status, 0, commandName);
			assert.match(result.stderr, /unknown command/i);
		}

		const oldAgentCommand = await runCli(['agent', 'create-token'], {
			cwd: workspace,
			env: {}
		});
		assert.notEqual(oldAgentCommand.status, 0);
		assert.match(oldAgentCommand.stderr, /unknown command/i);
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('tx prepare without --execute only prepares the transaction', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const inputFile = await writeJsonFile(workspace, 'prepare.json', {
		chainId: '11155111',
		signerAddress: TEST_WALLET.address,
		ownerEmail: 'owner@example.com',
		name: 'Research Agent',
		description: 'Agent for testing',
		image: 'https://example.com/agent.png',
		services: [{ name: 'forge', endpoint: 'https://example.com' }]
	});
	const server = await startMockServer({
		preparedResponse: {
			txId: '0xprepare-only',
			transactions: buildTransaction({ nonce: 1 }),
			info: { agentUuid: 'agent-uuid-1' }
		},
		sendResponse: { success: true }
	});

	try {
		const result = await runCli(
			[
				'tx',
				'prepare',
				'--method',
				'erc8004RegisterAgent',
				'--file',
				inputFile,
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl
			],
			{ cwd: workspace, env: {} }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].url, '/prepare-transactions');
		assert.equal(server.requests[0].body.method, 'erc8004RegisterAgent');

		const output = JSON.parse(result.stdout);
		assert.equal(output.txId, '0xprepare-only');
		assert.equal(output.info.agentUuid, 'agent-uuid-1');
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('tx prepare --execute prepares, signs, and sends a single transaction object', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const inputFile = await writeJsonFile(workspace, 'execute-single.json', {
		chainId: '11155111',
		signerAddress: TEST_WALLET.address,
		ownerEmail: 'owner@example.com',
		name: 'Research Agent',
		description: 'Agent for testing',
		image: 'https://example.com/agent.png',
		services: [{ name: 'forge', endpoint: 'https://example.com' }]
	});
	const preparedTransaction = buildTransaction({ nonce: 2 });
	const server = await startMockServer({
		preparedResponse: {
			txId: '0xsingle-execute',
			transactions: preparedTransaction,
			info: { agentUuid: 'agent-uuid-2' }
		},
		sendResponse: {
			success: true,
			totalTransactions: 1,
			successfulTransactions: 1,
			failedTransactions: 0,
			results: [
				{
					txId: '0xsingle-execute',
					success: true,
					result: {
						txResponses: [{ hash: '0xabc123' }]
					}
				}
			]
		}
	});

	try {
		const result = await runCli(
			[
				'tx',
				'prepare',
				'--method',
				'erc8004RegisterAgent',
				'--file',
				inputFile,
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl,
				'--execute'
			],
			{
				cwd: workspace,
				env: { BRICKKEN_PRIVATE_KEY: TEST_PRIVATE_KEY }
			}
		);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			server.requests.map((entry) => entry.url),
			['/prepare-transactions', '/send-transactions']
		);
		assert.equal(server.requests[1].body.txId, '0xsingle-execute');
		assert.equal(typeof server.requests[1].body.signedTransactions, 'string');
		assert.ok(server.requests[1].body.signedTransactions.startsWith('0x'));

		const output = JSON.parse(result.stdout);
		assert.equal(output.prepared.txId, '0xsingle-execute');
		assert.equal(output.signerAddress, TEST_WALLET.address);
		assert.equal(output.sent.results[0].result.txResponses[0].hash, '0xabc123');
		assert.equal(output.signedTransactions.length, 1);
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('tx prepare --execute handles transactions returned as an array', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const inputFile = await writeJsonFile(workspace, 'execute-array.json', {
		chainId: '11155111',
		signerAddress: TEST_WALLET.address,
		tokenAddress: '0x000000000000000000000000000000000000beef',
		ownerEmail: 'owner@example.com',
		to: TEST_WALLET.address,
		amount: '1000',
		decimals: 18
	});
	const server = await startMockServer({
		preparedResponse: {
			txId: ['0xarray-1', '0xarray-2'],
			transactions: [buildTransaction({ nonce: 3 }), buildTransaction({ nonce: 4 })]
		},
		sendResponse: {
			success: true,
			totalTransactions: 2,
			successfulTransactions: 2,
			failedTransactions: 0,
			results: [
				{ txId: '0xarray-1', success: true },
				{ txId: '0xarray-2', success: true }
			]
		}
	});

	try {
		const result = await runCli(
			[
				'tx',
				'prepare',
				'--method',
				'mintToken',
				'--file',
				inputFile,
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl,
				'--execute'
			],
			{
				cwd: workspace,
				env: { BRICKKEN_PRIVATE_KEY: TEST_PRIVATE_KEY }
			}
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 2);
		assert.deepEqual(server.requests[1].body.txId, ['0xarray-1', '0xarray-2']);
		assert.equal(Array.isArray(server.requests[1].body.signedTransactions), true);
		assert.equal(server.requests[1].body.signedTransactions.length, 2);

		const output = JSON.parse(result.stdout);
		assert.equal(output.prepared.transactions.length, 2);
		assert.equal(output.signedTransactions.length, 2);
		assert.equal(output.sent.totalTransactions, 2);
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('tx prepare --execute fails when no private key is configured', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const inputFile = await writeJsonFile(workspace, 'missing-key.json', {
		chainId: '11155111',
		signerAddress: TEST_WALLET.address,
		ownerEmail: 'owner@example.com',
		name: 'Research Agent',
		description: 'Agent for testing',
		image: 'https://example.com/agent.png',
		services: [{ name: 'forge', endpoint: 'https://example.com' }]
	});
	const server = await startMockServer({
		preparedResponse: {
			txId: '0xmissing-key',
			transactions: buildTransaction({ nonce: 5 })
		},
		sendResponse: { success: true }
	});

	try {
		const result = await runCli(
			[
				'tx',
				'prepare',
				'--method',
				'erc8004RegisterAgent',
				'--file',
				inputFile,
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl,
				'--execute'
			],
			{ cwd: workspace, env: {} }
		);

		assert.notEqual(result.status, 0);
		assert.equal(server.requests.length, 1);
		assert.match(result.stderr, /private key is required to execute/i);
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});

test('tx prepare --execute fails when the configured private key does not match signerAddress', async () => {
	const workspace = await createTempWorkspace();
	const envFile = await writeEnvFile(workspace);
	const inputFile = await writeJsonFile(workspace, 'signer-mismatch.json', {
		chainId: '11155111',
		signerAddress: ALT_WALLET.address,
		ownerEmail: 'owner@example.com',
		name: 'Research Agent',
		description: 'Agent for testing',
		image: 'https://example.com/agent.png',
		services: [{ name: 'forge', endpoint: 'https://example.com' }]
	});
	const server = await startMockServer({
		preparedResponse: {
			txId: '0xmismatch',
			transactions: buildTransaction({ nonce: 6, from: ALT_WALLET.address })
		},
		sendResponse: { success: true }
	});

	try {
		const result = await runCli(
			[
				'tx',
				'prepare',
				'--method',
				'erc8004RegisterAgent',
				'--file',
				inputFile,
				'--env-file',
				envFile,
				'--base-url',
				server.baseUrl,
				'--execute'
			],
			{
				cwd: workspace,
				env: { BRICKKEN_PRIVATE_KEY: TEST_PRIVATE_KEY }
			}
		);

		assert.notEqual(result.status, 0);
		assert.equal(server.requests.length, 1);
		assert.match(result.stderr, /does not match expected signer/i);
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});
