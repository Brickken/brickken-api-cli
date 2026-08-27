const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { spawn } = require('node:child_process');

const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');

function runCli(args, { cwd, env = {} }) {
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

test('dapp get sends query parameters with the configured API key', async () => {
	const server = await startServer({ tokenSymbol: 'EXMPL', status: 'success' });
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--api-key', 'dapp-key',
			'dapp', 'get',
			'--path', '/get-token-info',
			'--query', 'tokenSymbol=EXMPL'
		], { cwd: process.cwd() });
		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].method, 'GET');
		assert.equal(server.requests[0].pathname, '/get-token-info');
		assert.deepEqual(server.requests[0].query, { tokenSymbol: 'EXMPL' });
		assert.equal(server.requests[0].headers['x-api-key'], 'dapp-key');
	} finally {
		await server.close();
	}
});

test('dapp request sends a JSON body with the configured API key', async () => {
	const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'brickken-cli-dapp-test-'));
	const bodyFile = path.join(workspace, 'request.json');
	await fs.writeFile(bodyFile, JSON.stringify({
		tokenSymbol: 'EXMPL',
		signerAddress: '0x0000000000000000000000000000000000000001'
	}));
	const server = await startServer({ success: true });
	try {
		const result = await runCli([
			'--base-url', server.baseUrl,
			'--api-key', 'dapp-key',
			'dapp', 'request',
			'--method', 'POST',
			'--path', '/example-dapp-endpoint',
			'--file', bodyFile
		], { cwd: workspace });
		assert.equal(result.status, 0, result.stderr);
		assert.equal(server.requests.length, 1);
		assert.equal(server.requests[0].method, 'POST');
		assert.equal(server.requests[0].pathname, '/example-dapp-endpoint');
		assert.deepEqual(server.requests[0].body, {
			tokenSymbol: 'EXMPL',
			signerAddress: '0x0000000000000000000000000000000000000001'
		});
		assert.equal(server.requests[0].headers['x-api-key'], 'dapp-key');
	} finally {
		await server.close();
		await fs.rm(workspace, { recursive: true, force: true });
	}
});
