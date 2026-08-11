# Agentic API Reference

Use the Agentic API for ERC-8004 agent identity/reputation, agent-owned ERC-20 operations, and RAMS, the Regulated Agent Mandate Standard (ERC-8226). Writes are paid through x402 and blockchain transactions are signed locally. Agent getters, RAMS reads, and EIP-712 typed-data fetches use `x-api-key` when one is sent and otherwise fall back to x402.

Base URLs:

| Environment | URL |
| --- | --- |
| Forge | `https://d4aqanatl1.execute-api.eu-west-1.amazonaws.com/forge` |
| Sandbox | `https://api.sandbox.brickken.com` |
| Production | `https://api.brickken.com` |

## x402 Flow

1. Omit `x-api-key`.
2. Call a `/x402/...` facade, or `POST /prepare-transactions` with an eligible `method`.
3. If the API returns `402`, decode `PAYMENT-REQUIRED`.
4. Sign the x402 payment locally and retry with `X-Payment`.
5. Sign the returned blockchain transaction locally.
6. Submit signed transactions to `POST /send-transactions`, using the same x402 retry flow if needed.

Never hardcode x402 asset, amount, recipient, or network. Read them from `PAYMENT-REQUIRED`.

## KYC Link Creation

`POST /create-kyc-link` creates or reuses an investor and returns a Sumsub verification link. It always requires `x-api-key` and accepts:

```json
{
  "email": "investor@example.com",
  "needKyc": true
}
```

Creating a link can create the investor record and send an invitation. Treat the returned URL as sensitive and do not log or commit it.

## Agent Getters

| Endpoint | Query |
| --- | --- |
| `GET /get-agents` | Optional `chainId`, `ownerWalletAddress`, `limit`, `offset` with API key |
| `GET /get-agent-info` | `agentUuid`, or `agentId` with `chainId` |
| `GET /get-agent-transactions` | Agent reference plus optional `limit`, `offset` |

All three getters accept API-key authentication or x402. In x402 mode, `/get-agents` requires `chainId` and `ownerWalletAddress`, and the payment signer must match the owner wallet. The x402 price is 0.000001 USDC. Limits are 1-100 and offsets must be non-negative.

## Facade Endpoints

| Facade | Method |
| --- | --- |
| `POST /x402/agent/register` | `agentRegister` |
| `POST /x402/agent/set-uri` | `agentSetURI` |
| `POST /x402/agent/set-metadata` | `agentSetMetadata` |
| `POST /x402/agent/set-wallet` | `agentSetWallet` |
| `POST /x402/agent/feedback/give` | `agentGiveFeedback` |
| `POST /x402/agent/feedback/revoke` | `agentRevokeFeedback` |
| `POST /x402/agent/feedback/respond` | `agentAppendFeedbackResponse` |
| `POST /x402/token/create` | `agentCreateToken` |
| `POST /x402/token/mint` | `agentMintToken` |
| `POST /x402/token/burn` | `agentBurnToken` |
| `POST /x402/token/transfer` | `agentTransferToken` |
| `POST /x402/token/transfer-from` | `agentTransferFromToken` |
| `POST /x402/token/approve` | `agentApproveToken` |
| `POST /x402/rams/grant-mandate` | `ramsGrantMandate` |
| `POST /x402/rams/revoke-mandate` | `ramsRevokeMandate` |
| `POST /x402/rams/extend-mandate` | `ramsExtendMandate` |
| `POST /x402/rams/set-operator` | `ramsSetOperator` |
| `POST /x402/rams/execute` | `ramsExecute` |
| `POST /x402/rams/set-executor-action` | `ramsSetExecutorAction` |
| `POST /x402/rams/freeze-agent` | `ramsFreezeAgent` |
| `POST /x402/rams/unfreeze-agent` | `ramsUnfreezeAgent` |
| `POST /x402/rams/grant-principal` | `ramsGrantPrincipal` |
| `POST /x402/rams/revoke-principal` | `ramsRevokePrincipal` |

RAMS facades default to `client-signed`. Only grant, revoke, extend, and set-operator accept `executionMode: "brickken-relayed"`, and only when the matching principal EIP-712 `signature` and `deadline` are included; omit `signerAddress` in that mode because Brickken supplies its operation signer. Execute and all executor/compliance/enforcer administration are never relayed.

## RAMS Reads and Typed Data

Reads: `GET /rams/mandate`, `/rams/can-execute`, `/rams/status`, `/rams/compliance-status`, and `/rams/executor-action`. Send `x-api-key` to authenticate them, or omit it and settle the returned `402` with an x402 payment exactly as for writes.

Typed data: `GET /rams/typed-data/{grant-mandate|revoke-mandate|extend-mandate|set-operator}`. Sign the complete returned `typedData` locally, then submit the same operation fields with the returned `deadline` and signature. The nonce is shared per principal and is fetched on-chain; never default it to zero.

RAMS actions are left-aligned bytes32 selectors. Amounts and caps are raw token base units; cap fields accept `max`/`unlimited`.

## Important Fields

| Methods | Fields |
| --- | --- |
| `agentRegister`, `agentSetURI` | `name`, `description`, `image`, `services`, `metadata`, `aiModelName`, `aiModelProvider`, `tags`, `documentation`, `sourceCode`, `license`, `agentType`, `supportedTrust`, `x402Support`, `active` |
| `agentSetMetadata` | `agentUuid` or `agentId`, `metadataKey`, `metadataValue`, `metadataEncoding` |
| `agentSetWallet` | `agentUuid` or `agentId`, `newWallet`, `deadline`, `signature` |
| `agentGiveFeedback` | `agentUuid` or `agentId`, `value`, `valueDecimals`, `tag1`, `tag2`, `endpoint`, `feedbackURI`, `feedbackHash` |
| `agentRevokeFeedback` | `agentId`, `feedbackIndex` |
| `agentAppendFeedbackResponse` | `agentId`, `clientAddress`, `feedbackIndex`, `responseURI`, `responseHash` |
| `agentCreateToken` | `name`, `symbol`, `agentWallet`, `premint`, `decimals` |
| `agentMintToken` | `tokenAddress`, `to`, `amount`, `decimals` |
| `agentBurnToken` | `tokenAddress`, `from`, `amount`, `decimals` |
| `agentTransferToken` | `tokenAddress`, `to`, `amount`, `decimals` |
| `agentTransferFromToken` | `tokenAddress`, `from`, `to`, `amount`, `decimals` |
| `agentApproveToken` | `tokenAddress`, `spenderAddress`, `amount`, `decimals` |

Save `prepared.info.agentUuid` after `agentRegister`. Save `tokenAddress` after `agentCreateToken`.

## Mainnet Pricing

| Method | Prepare | Send | Total |
| --- | ---: | ---: | ---: |
| `agentRegister` | `0.50` | `0.49` | `0.99` |
| `agentSetURI` | `0.25` | `0.24` | `0.49` |
| `agentSetMetadata` | `0.25` | `0.24` | `0.49` |
| `agentSetWallet` | `0.50` | `0.49` | `0.99` |
| `agentGiveFeedback` | `0.13` | `0.12` | `0.25` |
| `agentRevokeFeedback` | `0.13` | `0.12` | `0.25` |
| `agentAppendFeedbackResponse` | `0.25` | `0.24` | `0.49` |
| `agentCreateToken` | `5.00` | `4.99` | `9.99` |
| `agentMintToken` | `0.05` | `0.05` | `0.10` |
| `agentBurnToken` | `0.03` | `0.02` | `0.05` |
| `agentTransferToken` | `0.03` | `0.02` | `0.05` |
| `agentTransferFromToken` | `0.03` | `0.02` | `0.05` |
| `agentApproveToken` | `0.02` | `0.01` | `0.03` |

Sandbox/non-production uses a low reference price, commonly around `0.01` USDC per call.
