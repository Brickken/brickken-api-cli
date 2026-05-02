import axios from 'axios';
import { ResolvedConfig } from './types';

const SEPOLIA_CHAIN_ID = 'aa36a7';
const DEFAULT_SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const DEFAULT_RECEIPT_POLL_INTERVAL_MS = 5000;
const DEFAULT_RECEIPT_TIMEOUT_MS = 180000;
const ERC20_TRANSFER_TOPIC =
	'0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS_TOPIC =
	'0x0000000000000000000000000000000000000000000000000000000000000000';

interface JsonRpcResponse<T> {
	jsonrpc?: string;
	id?: number | string;
	result?: T;
	error?: {
		code?: number;
		message?: string;
		data?: unknown;
	};
}

export interface TransactionReceiptLog {
	address?: string;
	topics?: string[];
	[key: string]: unknown;
}

export interface TransactionReceipt {
	transactionHash?: string;
	blockHash?: string;
	blockNumber?: string;
	status?: string;
	contractAddress?: string | null;
	logs?: TransactionReceiptLog[];
	[key: string]: unknown;
}

export interface ReceiptSummary {
	transactionHash?: string;
	blockHash?: string;
	blockNumber?: string;
	status?: string;
	contractAddress?: string | null;
}

export interface TokenAddressLookupDiagnostic {
	status: 'skipped' | 'failed' | 'not_found';
	message: string;
	txHashes?: string[];
	chainId?: string;
}

export interface TokenAddressLookupResult {
	tokenAddress?: string;
	tokenTxHash?: string;
	tokenReceipt?: ReceiptSummary;
	tokenAddressLookup?: TokenAddressLookupDiagnostic;
}

export function resolveReceiptRpcUrl(
	config: Pick<ResolvedConfig, 'rpcUrl'>,
	chainId?: unknown
): string | undefined {
	if (config.rpcUrl) {
		return config.rpcUrl;
	}

	const normalizedChainId = String(chainId || '').trim().toLowerCase().replace(/^0x/, '');
	if (normalizedChainId === SEPOLIA_CHAIN_ID) {
		return DEFAULT_SEPOLIA_RPC_URL;
	}

	return undefined;
}

export function extractSendTransactionHashes(sent: unknown): string[] {
	const hashes: string[] = [];

	function appendHash(value: unknown): void {
		if (typeof value !== 'string') {
			return;
		}

		const trimmed = value.trim();
		if (!trimmed || hashes.includes(trimmed)) {
			return;
		}

		hashes.push(trimmed);
	}

	const sentRecord = sent && typeof sent === 'object' ? (sent as Record<string, any>) : undefined;
	appendHash(sentRecord?.txHash);

	const results = sentRecord?.results;
	if (Array.isArray(results)) {
		for (const result of results) {
			appendHash(result?.txHash);
			appendHash(result?.result?.hash);

			if (Array.isArray(result?.result?.txResponses)) {
				for (const txResponse of result.result.txResponses) {
					appendHash(txResponse?.hash);
				}
			}
		}
	}

	return hashes;
}

async function getTransactionReceipt(
	rpcUrl: string,
	txHash: string
): Promise<TransactionReceipt | null> {
	const response = await axios.post<JsonRpcResponse<TransactionReceipt | null>>(
		rpcUrl,
		{
			jsonrpc: '2.0',
			id: 1,
			method: 'eth_getTransactionReceipt',
			params: [txHash]
		},
		{
			headers: {
				'Content-Type': 'application/json'
			},
			validateStatus: () => true
		}
	);

	if (response.status < 200 || response.status >= 300) {
		throw new Error(`RPC request failed with status ${response.status}`);
	}

	if (response.data.error) {
		throw new Error(response.data.error.message || 'RPC request failed');
	}

	return response.data.result || null;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForTransactionReceipt(params: {
	rpcUrl: string;
	txHash: string;
	pollIntervalMs?: number;
	timeoutMs?: number;
}): Promise<TransactionReceipt> {
	const pollIntervalMs = params.pollIntervalMs ?? DEFAULT_RECEIPT_POLL_INTERVAL_MS;
	const timeoutMs = params.timeoutMs ?? DEFAULT_RECEIPT_TIMEOUT_MS;
	const deadline = Date.now() + timeoutMs;

	while (true) {
		const receipt = await getTransactionReceipt(params.rpcUrl, params.txHash);
		if (receipt) {
			return receipt;
		}

		if (Date.now() >= deadline) {
			throw new Error(`Timed out waiting for receipt ${params.txHash}`);
		}

		await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
	}
}

export function extractTokenAddressFromReceipt(receipt: TransactionReceipt): string | undefined {
	for (const log of receipt.logs || []) {
		const topics = log.topics || [];
		if (
			topics[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC &&
			topics[1]?.toLowerCase() === ZERO_ADDRESS_TOPIC &&
			log.address
		) {
			return log.address;
		}
	}

	return receipt.contractAddress || undefined;
}

function summarizeReceipt(receipt: TransactionReceipt): ReceiptSummary {
	return Object.fromEntries(
		Object.entries({
			transactionHash: receipt.transactionHash,
			blockHash: receipt.blockHash,
			blockNumber: receipt.blockNumber,
			status: receipt.status,
			contractAddress: receipt.contractAddress
		}).filter(([, value]) => value !== undefined)
	) as ReceiptSummary;
}

function diagnostic(params: TokenAddressLookupDiagnostic): TokenAddressLookupResult {
	return {
		tokenAddressLookup: params
	};
}

export async function lookupTokenAddressFromSendResult(
	config: Pick<ResolvedConfig, 'rpcUrl'>,
	preparedBody: Record<string, any>,
	sent: unknown
): Promise<TokenAddressLookupResult> {
	const txHashes = extractSendTransactionHashes(sent);
	const chainId = preparedBody.chainId ? String(preparedBody.chainId) : undefined;

	if (txHashes.length === 0) {
		return diagnostic({
			status: 'skipped',
			message: 'No blockchain transaction hash was found in the send result.',
			chainId
		});
	}

	const rpcUrl = resolveReceiptRpcUrl(config, chainId);
	if (!rpcUrl) {
		return diagnostic({
			status: 'skipped',
			message:
				'No RPC URL is configured for token address lookup. Set --rpc-url, BRICKKEN_RPC_URL, or BKN_RPC_URL.',
			txHashes,
			chainId
		});
	}

	const errors: string[] = [];
	let hadLookupFailure = false;
	for (const txHash of txHashes) {
		try {
			const receipt = await waitForTransactionReceipt({ rpcUrl, txHash });
			const tokenAddress = extractTokenAddressFromReceipt(receipt);
			if (tokenAddress) {
				return {
					tokenAddress,
					tokenTxHash: txHash,
					tokenReceipt: summarizeReceipt(receipt)
				};
			}

			errors.push(`Receipt ${txHash} did not include a token address.`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			hadLookupFailure = true;
			errors.push(`${txHash}: ${message}`);
		}
	}

	return diagnostic({
		status: hadLookupFailure ? 'failed' : 'not_found',
		message: errors.join(' '),
		txHashes,
		chainId
	});
}
