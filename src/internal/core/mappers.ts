import { BigNumber, ethers } from 'ethers';
import { normalizeChainId } from './config';
import { RecordLike } from './types';

function cleanObject<T extends RecordLike>(input: T): T {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined)
	) as T;
}

function toBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim().toLowerCase();
	if (['true', '1', 'yes', 'allow', 'allowed'].includes(normalized)) {
		return true;
	}
	if (['false', '0', 'no', 'deny', 'denied'].includes(normalized)) {
		return false;
	}
	return undefined;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function buildBasePayload(input: RecordLike): RecordLike {
	return cleanObject({
		...input,
		chainId: normalizeChainId(input.chainId || input.chain),
		signerAddress: input.signerAddress
	});
}

function normalizeMintUsers(input: RecordLike): RecordLike[] {
	if (Array.isArray(input.userToMint)) {
		return input.userToMint.map((entry: RecordLike) =>
			cleanObject({
				...entry,
				investorEmail: entry.investorEmail || entry.email,
				needWhitelist: toBoolean(entry.needWhitelist) ?? entry.needWhitelist
			})
		);
	}

	if (!input.investorEmail && !input.email && !input.investorAddress && !input.amount) {
		return [];
	}

	return [
		cleanObject({
			investorEmail: input.investorEmail || input.email,
			investorAddress: input.investorAddress,
			amount: input.amount,
			needWhitelist: toBoolean(input.needWhitelist) ?? input.needWhitelist
		})
	];
}

function normalizeWhitelistUsers(input: RecordLike): RecordLike[] {
	if (Array.isArray(input.userToWhitelist)) {
		return input.userToWhitelist.map((entry: RecordLike) =>
			cleanObject({
				...entry,
				investorAddress: entry.investorAddress || entry.address,
				whitelistStatus: toBoolean(entry.whitelistStatus ?? entry.allow) ?? entry.whitelistStatus ?? entry.allow
			})
		);
	}

	if (!input.investorAddress && !input.address) {
		return [];
	}

	return [
		cleanObject({
			investorAddress: input.investorAddress || input.address,
			whitelistStatus: toBoolean(input.whitelistStatus ?? input.allow) ?? input.whitelistStatus ?? input.allow
		})
	];
}

function normalizePreMintEntries(input: RecordLike): RecordLike[] {
	const entries = normalizeArray(input.preMints);
	return entries.map((entry) => {
		if (typeof entry === 'object' && entry !== null) {
			return cleanObject({
				...entry,
				amount: entry.amount?.toString(),
				investorEmail: entry.investorEmail || entry.email,
				investorAddress: entry.investorAddress || entry.walletAddress,
				needWhitelist: toBoolean(entry.needWhitelist) ?? entry.needWhitelist
			});
		}

		return { amount: String(entry) };
	});
}

function normalizeInitialHolderEntries(input: RecordLike): RecordLike[] {
	const source = input.initialHolders ?? input.initialShareholders;
	const entries = normalizeArray(source);
	return entries.map((entry) => {
		if (typeof entry === 'object' && entry !== null) {
			return cleanObject({
				...entry,
				email: entry.email,
				walletAddress: entry.walletAddress || entry.investorAddress,
				amount: entry.amount?.toString()
			});
		}

		return { walletAddress: String(entry) };
	});
}

function deriveTokenizationLists(input: RecordLike): {
	preMints: RecordLike[];
	initialHolders: RecordLike[];
	shareholders: RecordLike[];
	initialTokenSupply?: string;
} {
	let preMints = normalizePreMintEntries(input);
	let initialHolders = normalizeInitialHolderEntries(input);

	if (preMints.length > 0 && initialHolders.length === 0) {
		initialHolders = preMints.map((entry) =>
			cleanObject({
				email: entry.investorEmail,
				walletAddress: entry.investorAddress
			})
		);
	}

	if (initialHolders.length > 0 && preMints.length === 0) {
		preMints = initialHolders.map((entry) =>
			cleanObject({
				investorEmail: entry.email,
				investorAddress: entry.walletAddress,
				amount: entry.amount
			})
		);
	}

	const maxLength = Math.max(preMints.length, initialHolders.length);
	const shareholders: RecordLike[] = [];
	let total = BigNumber.from(0);

	for (let index = 0; index < maxLength; index += 1) {
		const preMint = preMints[index] || {};
		const initialHolder = initialHolders[index] || {};
		const amount = preMint.amount || initialHolder.amount;

		if (!amount) {
			continue;
		}

		total = total.add(ethers.utils.parseEther(String(amount)));

		shareholders.push(
			cleanObject({
				email: preMint.investorEmail || initialHolder.email,
				amount: String(amount),
				walletAddress: preMint.investorAddress || initialHolder.walletAddress
			})
		);
	}

	return {
		preMints,
		initialHolders,
		shareholders,
		initialTokenSupply: total.gt(0) ? total.toString() : undefined
	};
}

export function mapNewTokenizationInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	const tokenizationLists = deriveTokenizationLists(input);
	const name = input.name || input.tokenName;

	return cleanObject({
		...basePayload,
		method: 'newTokenization',
		name,
		tokenName: input.tokenName || name,
		tokenSymbol: input.tokenSymbol || input.symbol,
		tokenizerEmail: input.tokenizerEmail,
		tokenizerAddress: input.tokenizerAddress || input.signerAddress,
		signerAddress: input.signerAddress || input.tokenizerAddress,
		tokenizerCompanyName: input.tokenizerCompanyName || input.companyName,
		tokenizerName: input.tokenizerName,
		tokenizerSurname: input.tokenizerSurname,
		tokenizerMiddleName: input.tokenizerMiddleName,
		tokenizerSecondSurname: input.tokenizerSecondSurname,
		supplyCap: input.supplyCap?.toString(),
		url: input.url,
		paymentTokenAddress: input.paymentTokenAddress,
		preMints: tokenizationLists.preMints.length > 0 ? tokenizationLists.preMints : undefined,
		initialHolders: tokenizationLists.initialHolders.length > 0 ? tokenizationLists.initialHolders : undefined,
		shareholders: tokenizationLists.shareholders.length > 0 ? tokenizationLists.shareholders : undefined,
		initialTokenSupply: tokenizationLists.initialTokenSupply,
		tokenType: input.tokenType
	});
}

export function mapNewStoInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'newSto',
		tokenizerEmail: input.tokenizerEmail,
		tokenSymbol: input.tokenSymbol,
		tokenAmount: input.tokenAmount || input.issuanceAmount,
		offeringName: input.offeringName || input.name,
		startDate: input.startDate,
		endDate: input.endDate,
		acceptedCoin: input.acceptedCoin || input.paymentTokenSymbol || input.paymentToken,
		minRaiseUSD: input.minRaiseUSD || input.softCap,
		maxRaiseUSD: input.maxRaiseUSD || input.hardCap,
		minInvestment: input.minInvestment,
		maxInvestment: input.maxInvestment
	});
}

export function mapInvestInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'newInvest',
		tokenSymbol: input.tokenSymbol,
		investorEmail: input.investorEmail || input.email,
		investorAddress: input.investorAddress,
		signerAddress: input.signerAddress || input.investorAddress,
		investmentAmount: input.investmentAmount || input.amount,
		paymentTokenSymbol: input.paymentTokenSymbol
	});
}

export function mapClaimInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'claimTokens',
		tokenSymbol: input.tokenSymbol,
		investorEmail: input.investorEmail || input.email,
		investorAddress: input.investorAddress,
		signerAddress: input.signerAddress || input.investorAddress
	});
}

export function mapCloseInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'closeOffer',
		tokenSymbol: input.tokenSymbol,
		tokenizerEmail: input.tokenizerEmail,
		signerAddress: input.signerAddress
	});
}

export function mapMintInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	const userToMint = normalizeMintUsers(input);

	return cleanObject({
		...basePayload,
		method: 'mintToken',
		tokenSymbol: input.tokenSymbol,
		signerAddress: input.signerAddress,
		userToMint: userToMint.length > 0 ? userToMint : undefined
	});
}

export function mapWhitelistInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	const userToWhitelist = normalizeWhitelistUsers(input);

	return cleanObject({
		...basePayload,
		method: 'whitelist',
		tokenSymbol: input.tokenSymbol,
		signerAddress: input.signerAddress,
		userToWhitelist: userToWhitelist.length > 0 ? userToWhitelist : undefined
	});
}

export function mapBurnInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'burnToken',
		tokenSymbol: input.tokenSymbol,
		signerAddress: input.signerAddress,
		amount: input.amount
	});
}

export function mapTransferInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	const method = input.from ? 'transferFrom' : 'transferTo';

	return cleanObject({
		...basePayload,
		method,
		tokenSymbol: input.tokenSymbol,
		signerAddress: input.signerAddress,
		from: input.from,
		to: input.to,
		amount: input.amount
	});
}

export function mapApproveInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'approve',
		tokenSymbol: input.tokenSymbol,
		signerAddress: input.signerAddress,
		investorAddress: input.investorAddress,
		spenderAddress: input.spenderAddress,
		amount: input.amount
	});
}

export function mapDividendInput(input: RecordLike): RecordLike {
	const basePayload = buildBasePayload(input);
	return cleanObject({
		...basePayload,
		method: 'dividendDistribution',
		tokenSymbol: input.tokenSymbol,
		signerAddress: input.signerAddress,
		amount: input.amount
	});
}

export function prepareBodyForMethod(method: string, input: RecordLike): RecordLike {
	switch (method) {
		case 'newTokenization':
			return mapNewTokenizationInput(input);
		case 'newSto':
			return mapNewStoInput(input);
		case 'newInvest':
			return mapInvestInput(input);
		case 'claimTokens':
			return mapClaimInput(input);
		case 'closeOffer':
			return mapCloseInput(input);
		case 'mintToken':
			return mapMintInput(input);
		case 'whitelist':
			return mapWhitelistInput(input);
		case 'burnToken':
			return mapBurnInput(input);
		case 'transferFrom':
		case 'transferTo':
			return mapTransferInput({ ...input, method });
		case 'approve':
			return mapApproveInput(input);
		case 'dividendDistribution':
			return mapDividendInput(input);
		default:
			return cleanObject({
				...input,
				method,
				chainId: normalizeChainId(input.chainId || input.chain)
			});
	}
}

export function cleanInput(input: RecordLike): RecordLike {
	return cleanObject(input);
}
