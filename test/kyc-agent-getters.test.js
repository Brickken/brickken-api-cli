const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');

function runCli(args, env = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [CLI_PATH, '--json', ...args], {
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
		child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
		child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
		child.on('error', reject);
		child.on('close', status => resolve({ status, stdout, stderr }));
	});
}

async function startServer(responseBody) {
	const requests = [];
	const server = http.createServer((req, res) => {
		const chunks = [];
		req.on('data', chunk => chunks.push(chunk));
		req.on('end', () => {
			const url = new URL(req.url, 'http://127.0.0.1');
			const rawBody = Buffer.concat(chunks).toString('utf8');
			requests.push({
				method: req.method,
				pathname: url.pathname,
				query: Object.fromEntries(url.searchParams.entries()),
				headers: req.headers,
				body: rawBody ? JSON.parse(rawBody) : undefined
			});
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(responseBody));
		});
	});

	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		requests,
		close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
	};
}

test('kyc create-link requires an API key and maps needKyc as a boolean', async () => {
	const server = await startServer({ email: 'investor@example.com', needKyc: false, url: null });
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--api-key', 'sandbox-key',
			'kyc', 'create-link',
			'--email', 'investor@example.com',
			'--need-kyc', 'false'
		]);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.deepEqual(server.requests[0].body, { email: 'investor@example.com', needKyc: false });
		assert.equal(server.requests[0].headers['x-api-key'], 'sandbox-key');
	} finally {
		await server.close();
	}
});

test('kyc create-link fails locally when no API key is configured', async () => {
	const result = await runCli([
		'--base-url', 'http://127.0.0.1:1',
		'kyc', 'create-link',
		'--email', 'investor@example.com'
	]);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /API key is required/);
});

test('agent list sends filters and API-key-or-x402 authentication', async () => {
	const server = await startServer({ agents: [], total: 0, limit: 10, offset: 2 });
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--api-key', 'sandbox-key',
			'agent', 'list',
			'--chain', '84532',
			'--owner-wallet-address', '0x0000000000000000000000000000000000000001',
			'--limit', '10',
			'--offset', '2'
		]);
		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(server.requests[0].query, {
			chainId: '14a34',
			ownerWalletAddress: '0x0000000000000000000000000000000000000001',
			limit: '10',
			offset: '2'
		});
		assert.equal(server.requests[0].headers['x-api-key'], 'sandbox-key');
	} finally {
		await server.close();
	}
});

test('agent info accepts an agent UUID without a chain', async () => {
	const server = await startServer({ uuid: 'agent-1', status: 'success' });
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--api-key', 'sandbox-key',
			'agent', 'info', '--agent-uuid', 'agent-1'
		]);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests[0].pathname, '/get-agent-info');
		assert.deepEqual(server.requests[0].query, { agentUuid: 'agent-1' });
	} finally {
		await server.close();
	}
});

test('agent transactions accepts agentId plus chain and pagination', async () => {
	const server = await startServer({ agentUuid: 'agent-1', transactions: [], total: 0, limit: 25, offset: 5 });
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--api-key', 'sandbox-key',
			'agent', 'transactions',
			'--agent-id', '8896',
			'--chain', '84532',
			'--limit', '25',
			'--offset', '5'
		]);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests[0].pathname, '/get-agent-transactions');
		assert.deepEqual(server.requests[0].query, {
			agentId: '8896',
			chainId: '14a34',
			limit: '25',
			offset: '5'
		});
	} finally {
		await server.close();
	}
});
