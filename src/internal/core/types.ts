export type BrickkenEnvironment = 'sandbox' | 'production';

export interface ResolvedConfig {
	env: BrickkenEnvironment;
	baseUrl: string;
	privateKey?: string;
	outputJson?: boolean;
}

export interface X402Requirement {
	scheme: string;
	network: string;
	asset: string;
	amount: string;
	payTo: string;
	extra?: {
		displayPrice?: string;
		name?: string;
		version?: string;
		[key: string]: any;
	};
	[key: string]: any;
}

export interface X402Metadata {
	payerAddress: string;
	requirement: X402Requirement;
	settlement?: Record<string, any>;
}

export type RecordLike = Record<string, any>;
