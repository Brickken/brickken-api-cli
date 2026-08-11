import { ethers } from 'ethers';
import { RecordLike } from './types';

export interface Eip712TypedData {
	domain: RecordLike;
	types: Record<string, Array<{ name: string; type: string }>>;
	message: RecordLike;
	primaryType?: string;
}

export async function signTypedDataLocally(
	typedData: Eip712TypedData,
	privateKey: string,
	expectedSigner?: string
): Promise<{ signerAddress: string; signature: string }> {
	const wallet = new ethers.Wallet(privateKey);

	if (
		expectedSigner &&
		wallet.address.toLowerCase() !== String(expectedSigner).toLowerCase()
	) {
		throw new Error(`Configured private key does not match expected signer ${expectedSigner}`);
	}

	// ethers v5 derives the EIP712Domain type from the domain object and throws
	// on extra primary types, so strip it defensively (MetaMask-style envelopes
	// may include it even though the Brickken API omits it).
	const types = { ...(typedData.types || {}) };
	delete (types as RecordLike).EIP712Domain;

	const signature = await wallet._signTypedData(typedData.domain, types, typedData.message);

	return {
		signerAddress: wallet.address,
		signature
	};
}
