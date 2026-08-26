const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Wallet } = require('ethers');

const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');
const wallet = Wallet.createRandom();
const recipientAddress = Wallet.createRandom().address;
const explicitKey = '4d0f91d8-453d-4fb5-a8e1-c722bc7b75a1';

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

const responseBody = {
	claimId: '1d0f91d8-453d-4fb5-a8e1-c722bc7b75a2',
	status: 'submitted',
	chainId: '11155111',
	recipientAddress,
	amount: '100',
	amountRaw: '100000000000000000000',
	token: { address: Wallet.createRandom().address, symbol: 'BKN', decimals: 18 },
	transactionHash: `0x${'33'.repeat(32)}`,
	explorerUrl: `https://sepolia.etherscan.io/tx/0x${'33'.repeat(32)}`,
	cooldownEndsAt: '2026-08-26T12:00:00.000Z'
};

async function startServer({ x402 = false } = {}) {
	const requests = [];
	const paymentRequired = Buffer.from(JSON.stringify({
		x402Version: 2,
		accepts: [{
			scheme: 'exact',
			network: 'eip155:11155111',
			asset: Wallet.createRandom().address,
			amount: '10000',
			payTo: Wallet.createRandom().address,
			maxTimeoutSeconds: 300,
			extra: { name: 'USDC', version: '2', decimals: 6, displayPrice: '0.01 USDC' }
		}]
	})).toString('base64');
	const paymentResponse = Buffer.from(JSON.stringify({
		success: true,
		transaction: `0x${'44'.repeat(32)}`,
		network: 'eip155:11155111'
	})).toString('base64');

	const server = http.createServer((req, res) => {
		const chunks = [];
		req.on('data', chunk => chunks.push(chunk));
		req.on('end', () => {
			requests.push({
				method: req.method,
				url: req.url,
				headers: req.headers,
				body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
			});
			if (x402 && !req.headers['x-payment']) {
				res.writeHead(402, { 'content-type': 'application/json', 'PAYMENT-REQUIRED': paymentRequired });
				res.end(JSON.stringify({ error: 'Payment Required' }));
				return;
			}
			res.writeHead(202, {
				'content-type': 'application/json',
				...(x402 ? { 'PAYMENT-RESPONSE': paymentResponse } : {})
			});
			res.end(JSON.stringify(responseBody));
		});
	});
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	return {
		requests,
		baseUrl: `http://127.0.0.1:${address.port}`,
		close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
	};
}

test('faucet bkn generates and returns a UUID v4 in API-key mode', async () => {
	const server = await startServer();
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--api-key', 'sandbox-key',
			'faucet', 'bkn',
			'--recipient-address', recipientAddress
		]);
		assert.equal(result.status, 0, result.stderr);
		const output = JSON.parse(result.stdout);
		assert.match(output.idempotencyKey, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		assert.equal(server.requests[0].headers['idempotency-key'], output.idempotencyKey);
		assert.equal(server.requests[0].headers['x-api-key'], 'sandbox-key');
		assert.deepEqual(server.requests[0].body, { recipientAddress });
	} finally {
		await server.close();
	}
});

test('faucet bkn preserves the explicit UUID through x402 replay', async () => {
	const server = await startServer({ x402: true });
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--private-key', wallet.privateKey,
			'faucet', 'bkn',
			'--recipient-address', recipientAddress,
			'--idempotency-key', explicitKey
		]);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 2);
		assert.equal(server.requests[0].headers['idempotency-key'], explicitKey);
		assert.equal(server.requests[1].headers['idempotency-key'], explicitKey);
		assert.ok(server.requests[1].headers['x-payment']);
		assert.equal(server.requests[1].headers['x-api-key'], undefined);
		const output = JSON.parse(result.stdout);
		assert.equal(output.idempotencyKey, explicitKey);
		assert.equal(output._x402.requirement.extra.displayPrice, '0.01 USDC');
		assert.equal(output._x402.settlement.success, true);
	} finally {
		await server.close();
	}
});

test('faucet bkn rejects invalid UUIDs and conflicting credentials locally', async () => {
	const invalid = await runCli([
		'--base-url', 'http://127.0.0.1:1',
		'--api-key', 'sandbox-key',
		'faucet', 'bkn',
		'--recipient-address', recipientAddress,
		'--idempotency-key', 'not-a-uuid'
	]);
	assert.equal(invalid.status, 1);
	assert.match(invalid.stderr, /UUID v4/);

	const both = await runCli([
		'--base-url', 'http://127.0.0.1:1',
		'--api-key', 'sandbox-key',
		'--private-key', wallet.privateKey,
		'faucet', 'bkn',
		'--recipient-address', recipientAddress
	]);
	assert.equal(both.status, 1);
	assert.match(both.stderr, /never both/);
});
