# Agentic API Reference

Use the Agentic API when the user has no Brickken API key and wants ERC-8004 agent identity, reputation, or agent-owned ERC-20 operations. It is paid through x402 and signs transactions locally with a private key.

Base URLs:

| Environment | URL |
| --- | --- |
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
