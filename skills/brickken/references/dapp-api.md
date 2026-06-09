# dapp API Reference

Use the dapp API when the user has `BRICKKEN_API_KEY` and needs tokenization, STO, security-token, or read workflows.

Base URLs:

| Environment | URL |
| --- | --- |
| Sandbox | `https://api.sandbox.brickken.com` |
| Production | `https://api.brickken.com` |

Auth header:

```http
x-api-key: $BRICKKEN_API_KEY
```

## Write Flow

1. `POST /prepare-transactions` with `method`, `chainId`, signer, and method fields.
2. Sign returned `transactions` with the wallet matching `signerAddress`.
3. `POST /send-transactions` with `txId` and `signedTransactions`.
4. Poll `GET /get-transaction-status`.

Supported `method` values:

| Area | Methods |
| --- | --- |
| Tokenization | `newTokenization`, `mintToken`, `whitelist`, `burnToken`, `transferFrom`, `transferTo`, `approve`, `dividendDistribution` |
| STOs | `newSto`, `newInvest`, `claimTokens`, `closeOffer` |

Use the docs pages for full body/response examples:

- `/api-reference/endpoint/create`
- `/api-reference/endpoint/prepare-newTokenization`
- `/api-reference/endpoint/prepare-mintToken`
- `/api-reference/endpoint/prepare-whitelist`
- `/api-reference/endpoint/prepare-burnToken`
- `/api-reference/endpoint/prepare-transferFrom`
- `/api-reference/endpoint/prepare-transferTo`
- `/api-reference/endpoint/prepare-approve`
- `/api-reference/endpoint/prepare-dividendDistribution`
- `/api-reference/endpoint/prepare-newSto`
- `/api-reference/endpoint/prepare-newInvest`
- `/api-reference/endpoint/prepare-claimTokens`
- `/api-reference/endpoint/prepare-closeOffer`
- `/api-reference/endpoint/send`

## Read Endpoints

Use API key auth for all read endpoints.

| Endpoint | Purpose |
| --- | --- |
| `GET /get-network-info` | Network metadata |
| `GET /get-token-info` | Token info |
| `GET /get-tokenizer-info` | Tokenizer info |
| `GET /get-stos` | STO list |
| `GET /get-sto-by-id` | One STO |
| `GET /get-investments-by-sto-id` | STO investments |
| `GET /get-investor-info` | Investor status |
| `GET /get-allowance` | Allowance |
| `GET /get-balance-whitelist` | Balance + whitelist |
| `GET /get-whitelist-status` | Wallet whitelist status |
| `GET /get-sto-balance` | STO balance/status |
| `GET /get-dividend-distribution` | Dividend info |
| `GET /get-transaction-status` | Transaction status |

## Chain IDs

| Network | Decimal | Hex |
| --- | --- | --- |
| Ethereum | `1` | `0x1` |
| Base | `8453` | `0x2105` |
| BNB Smart Chain | `56` | `0x38` |
| Polygon | `137` | `0x89` |
| Sepolia | `11155111` | `0xaa36a7` |
| Polygon Amoy | `80002` | `0x13882` |
