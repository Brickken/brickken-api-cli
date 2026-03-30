import { HttpError, ResolvedConfig } from '@brickken/core';

export function printResult(result: any, config: ResolvedConfig, label?: string): void {
	if (config.outputJson) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log(formatHumanReadable(result, label));
}

export function printCliError(error: unknown, asJson: boolean): void {
	if (error instanceof HttpError) {
		if (asJson) {
			console.error(
				JSON.stringify(
					{
						error: {
							message: error.message,
							status: error.status,
							details: error.data
						}
					},
					null,
					2
				)
			);
			return;
		}

		console.error(error.message);
		if (error.data) {
			console.error(JSON.stringify(error.data, null, 2));
		}
		return;
	}

	const message = error instanceof Error ? error.message : String(error);
	if (asJson) {
		console.error(JSON.stringify({ error: { message } }, null, 2));
		return;
	}

	console.error(message);
}

function formatHumanReadable(result: any, label?: string): string {
	const lines: string[] = [];
	if (label) {
		lines.push(label);
	}

	if (result?.prepared || result?.sent) {
		if (result.prepared?.txId) {
			const preparedTransactions = normalizeTransactionCount(result.prepared.transactions);
			lines.push(`Prepared ${preparedTransactions} transaction(s).`);
			lines.push(`txId: ${formatMaybeArray(result.prepared.txId)}`);
			appendX402Summary(lines, result.prepared);
		}

		if (result.sent) {
			lines.push(
				`Send result: ${result.sent.success === false ? 'failed' : 'success'} (${result.sent.successfulTransactions ?? 0}/${result.sent.totalTransactions ?? 0})`
			);
			appendX402Summary(lines, result.sent);
		}

		lines.push(JSON.stringify(result, null, 2));
		return lines.join('\n');
	}

	if (result?.txId && result?.transactions) {
		lines.push(`Prepared ${normalizeTransactionCount(result.transactions)} transaction(s).`);
		lines.push(`txId: ${formatMaybeArray(result.txId)}`);
		appendX402Summary(lines, result);
		lines.push(JSON.stringify(result, null, 2));
		return lines.join('\n');
	}

	if (result?.signedTransaction || result?.signedTransactions) {
		lines.push('Transaction signing completed.');
		lines.push(JSON.stringify(result, null, 2));
		return lines.join('\n');
	}

	if (result?.totalTransactions !== undefined) {
		lines.push(
			`Send result: ${result.success === false ? 'failed' : 'success'} (${result.successfulTransactions ?? 0}/${result.totalTransactions})`
		);
		lines.push(JSON.stringify(result, null, 2));
		return lines.join('\n');
	}

	if (result?.batchId) {
		lines.push(`Batch ${result.batchId} finished with status ${result.status}.`);
		appendX402Summary(lines, result);
		lines.push(JSON.stringify(result, null, 2));
		return lines.join('\n');
	}

	appendX402Summary(lines, result);
	lines.push(JSON.stringify(result, null, 2));
	return lines.join('\n');
}

function normalizeTransactionCount(transactions: unknown): number {
	if (Array.isArray(transactions)) {
		return transactions.length;
	}

	return transactions ? 1 : 0;
}

function formatMaybeArray(value: unknown): string {
	if (Array.isArray(value)) {
		return value.join(', ');
	}

	return String(value);
}

function appendX402Summary(lines: string[], result: any): void {
	const x402 = result?._x402;
	if (!x402?.requirement) {
		return;
	}

	const displayPrice = x402.requirement.extra?.displayPrice;
	const paymentLabel = displayPrice
		? `x402 payment: ${displayPrice}`
		: `x402 payment: ${x402.requirement.amount} on ${x402.requirement.network}`;

	lines.push(paymentLabel);
	lines.push(`Payment network: ${x402.requirement.network}`);
	if (x402.settlement?.transaction) {
		lines.push(`Settlement tx: ${x402.settlement.transaction}`);
	}
}

export function hasLogicalFailure(result: any): boolean {
	if (!result || typeof result !== 'object') {
		return false;
	}

	if (result.success === false) {
		return true;
	}

	if (result.status === 'failed' || result.status === 'partial_success') {
		return true;
	}

	if (typeof result.failedTransactions === 'number' && result.failedTransactions > 0) {
		return true;
	}

	if (result.sent && hasLogicalFailure(result.sent)) {
		return true;
	}

	if (Array.isArray(result.results)) {
		return result.results.some((entry: any) => hasLogicalFailure(entry));
	}

	return false;
}
