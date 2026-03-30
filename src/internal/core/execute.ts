import { ethers } from 'ethers';
import { requestJson } from './http';
import { ResolvedConfig } from './types';

function normalizeTransactions(transactions: any): any[] {
	if (!transactions) {
		return [];
	}

	return Array.isArray(transactions) ? transactions : [transactions];
}

export function getExpectedSignerAddress(payload: Record<string, any>): string | undefined {
	return payload.signerAddress || payload.investorAddress || payload.tokenizerAddress;
}

export async function signTransactionsLocally(
	transactions: any[],
	privateKey: string,
	expectedSigner?: string
): Promise<{ signerAddress: string; signedTransactions: string[] }> {
	const wallet = new ethers.Wallet(privateKey);

	if (
		expectedSigner &&
		wallet.address.toLowerCase() !== String(expectedSigner).toLowerCase()
	) {
		throw new Error(`Configured private key does not match expected signer ${expectedSigner}`);
	}

	const signedTransactions = [];
	for (const transaction of transactions) {
		signedTransactions.push(await wallet.signTransaction(transaction));
	}

	return {
		signerAddress: wallet.address,
		signedTransactions
	};
}

export async function executePreparedResponse(
	config: ResolvedConfig,
	preparedBody: Record<string, any>,
	preparedResponse: any
): Promise<any> {
	if (!config.privateKey) {
		throw new Error(
			'A private key is required to execute. Set BKN_PRIVATE_KEY or BRICKKEN_PRIVATE_KEY.'
		);
	}

	const transactions = normalizeTransactions(preparedResponse?.transactions);
	if (transactions.length === 0 || !preparedResponse?.txId) {
		return {
			prepared: preparedResponse
		};
	}

	const { signerAddress, signedTransactions } = await signTransactionsLocally(
		transactions,
		config.privateKey,
		getExpectedSignerAddress(preparedBody)
	);

	const txIds = Array.isArray(preparedResponse.txId)
		? preparedResponse.txId
		: transactions.length === 1
			? preparedResponse.txId
			: new Array(transactions.length).fill(preparedResponse.txId);

	const sendBody =
		transactions.length === 1
			? {
					txId: txIds,
					signedTransactions: signedTransactions[0]
			  }
			: {
					txId: txIds,
					signedTransactions
			  };

	const sent = await requestJson<any>(config, {
		method: 'POST',
		path: '/send-transactions',
		data: sendBody
	});

	return {
		prepared: preparedResponse,
		signerAddress,
		signedTransactions,
		sent
	};
}
