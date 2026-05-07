# Brickken CLI

Public x402-paid CLI for the [Brickken](https://brickken.com) agentic API.

It covers:

- ERC-8004 agent identity operations
- ERC-8004 reputation feedback operations
- x402-capable agentic token create, mint, burn, transfer, transfer-from, and approve operations
- raw transaction preparation, signing, sending, and one-shot execution

Repository: https://github.com/Brickken/brickken-api-cli

## Install

```bash
npm install -g brickken-cli
```

## Authentication

The CLI is x402-only. Do not pass or export API keys; `BRICKKEN_API_KEY` and `BKN_API_KEY` are ignored.

Provide a private key for local transaction signing and x402 payment signing:

```bash
export BRICKKEN_PRIVATE_KEY=0x...
```

## Quick Start

The high-level commands are wallet-first and prepare-only by default. Add `--execute` to prepare, sign locally, send, and pay the API request through x402 in one step.

Agentic operations do not require a tokenizer user in the Brickken database. `--owner-email` is optional metadata and can be omitted.

For a QA-oriented terminal walkthrough, see [QA_TERMINAL_DEMO.md](QA_TERMINAL_DEMO.md).

Example setup:

```bash
export BASE_URL="https://api.sandbox.brickken.com"
export CHAIN="11155111"
export WALLET="0xYourWallet"
export BRICKKEN_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
```

The CLI accepts chain identifiers as decimal or hex-like values. For example, Sepolia can be passed as `11155111` or `aa36a7`.

Sanity checks:

```bash
brickken --version
test -n "$BRICKKEN_PRIVATE_KEY" && echo "private key ok" || echo "private key missing"
test -n "$BRICKKEN_RPC_URL" && echo "rpc ok" || echo "rpc missing"
command -v jq
```

## Environment Notes

- Prefer `sandbox` or another environment with agent persistence enabled for the full `register -> set-uri -> set-metadata` flow.
- Internal development environments such as `stage2` may accept `register` on-chain but fail later profile mutations if the backend does not persist or index the returned `agentUuid`.
- Public explorers such as 8004scan may not index non-public environments even when the on-chain transaction succeeded.
- Budget Sepolia USDC accordingly. A full QA run with retries can consume roughly `0.02 USDC` per executed command because both prepare and send are x402-priced.

## Input Safety

The CLI supports `--json`. When a command appears to "drop" fields, the usual cause is shell expansion, empty variables, or inline JSON quoting, not the JSON output flag itself.

- Quote every variable that can contain spaces.
- Prefer `--file` for nested JSON, long text, automation, or values assembled by shell scripts.
- Echo critical variables such as `AGENT_UUID` and `TOKEN_ADDRESS` before reusing them in the next command.
- Do not continue from `create-token` into `mint` or `burn` unless `tokenAddress` is present in the output.

## Agent Flow

Register the agent:

```bash
brickken agent register \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --name "Research Agent" \
  --description "On-chain AI research agent" \
  --image https://example.com/agent.png \
  --service-name A2A \
  --service-endpoint https://agent.example/.well-known/agent-card.json \
  --service-version 0.3.0 \
  --ai-model-provider OpenAI \
  --ai-model-name "Research Model" \
  --x402-support true \
  --execute \
  --json | tee register-output.json
```

Capture the returned UUID:

```bash
export AGENT_UUID="$(jq -r '.prepared.info.agentUuid' register-output.json)"
```

Finalize the agent profile:

```bash
brickken agent set-uri \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --agent-uuid "$AGENT_UUID" \
  --name "Research Agent" \
  --description "On-chain AI research agent" \
  --image https://example.com/agent.png \
  --service-name A2A \
  --service-endpoint https://agent.example/.well-known/agent-card.json \
  --service-version 0.3.0 \
  --ai-model-provider OpenAI \
  --ai-model-name "Research Model" \
  --tag ai-agent \
  --tag terminal-demo \
  --documentation https://docs.brickken.com \
  --source-code https://github.com/Brickken/brickken-api-cli \
  --license MIT \
  --agent-type research \
  --supported-trust feedback \
  --x402-support true \
  --active true \
  --execute \
  --json
```

Set structured agent metadata:

```bash
brickken agent set-metadata \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --agent-uuid "$AGENT_UUID" \
  --metadata-key capabilities \
  --metadata-value '{"tasks":["research","summarization","token-operations"]}' \
  --metadata-encoding json \
  --execute \
  --json
```

For more complex metadata payloads, prefer a file:

```bash
cat > metadata.json <<'EOF'
{
  "chain": "11155111",
  "signerAddress": "0xYourWallet",
  "agentUuid": "00000000-0000-0000-0000-000000000000",
  "metadataKey": "capabilities",
  "metadataValue": "{\"tasks\":[\"research\",\"summarization\",\"token-operations\"]}",
  "metadataEncoding": "json"
}
EOF

brickken tx prepare \
  --method agentSetMetadata \
  --file metadata.json \
  --execute \
  --json
```

## Token Flow

Deploy an agentic token through the high-level command:

```bash
brickken create-token \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --name "Research Agent Token" \
  --symbol RAGT \
  --agent-wallet "$WALLET" \
  --premint 1000 \
  --decimals 18 \
  --execute \
  --json | tee create-token-output.json
```

When `create-token --execute` succeeds, the CLI waits for the deployment receipt and adds `tokenAddress` to the JSON output. Sepolia has a built-in public RPC fallback; for other chains set `--rpc-url`, `BRICKKEN_RPC_URL`, or `BKN_RPC_URL`.

```bash
export TOKEN_ADDRESS="$(jq -r '.tokenAddress' create-token-output.json)"
```

Mint more tokens:

```bash
brickken mint \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address 0xDeployedAgentToken \
  --to 0xRecipientWallet \
  --amount 100 \
  --decimals 18 \
  --execute \
  --json
```

Burn tokens:

```bash
brickken burn \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address 0xDeployedAgentToken \
  --from 0xHolderWallet \
  --amount 25 \
  --decimals 18 \
  --execute \
  --json
```

Approve allowance:

```bash
brickken approve \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address 0xDeployedAgentToken \
  --spender-address 0xSpenderWallet \
  --amount 50 \
  --decimals 18 \
  --execute \
  --json
```

Transfer tokens:

```bash
brickken transfer \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address 0xDeployedAgentToken \
  --to 0xRecipientWallet \
  --amount 10 \
  --decimals 18 \
  --execute \
  --json
```

Transfer through allowance:

```bash
brickken transfer-from \
  --chain "$CHAIN" \
  --signer-address 0xApprovedSpenderWallet \
  --token-address 0xDeployedAgentToken \
  --from 0xTokenHolderWallet \
  --to 0xRecipientWallet \
  --amount 5 \
  --decimals 18 \
  --execute \
  --json
```

The high-level `create-token`, `mint`, `burn`, `transfer`, `transfer-from`, and `approve` commands use the agentic backend methods `agentCreateToken`, `agentMintToken`, `agentBurnToken`, `agentTransferToken`, `agentTransferFromToken`, and `agentApproveToken`.

## Command Groups

- `brickken agent`: ERC-8004 identity and reputation operations
- `brickken create-token`: deploy an agentic ERC-20 through the x402 flow
- `brickken mint`: mint an agentic ERC-20 through the x402 flow
- `brickken burn`: burn an agentic ERC-20 through the x402 flow
- `brickken approve`: approve ERC-20 allowance through the x402 flow
- `brickken transfer`: transfer ERC-20 tokens through the x402 flow
- `brickken transfer-from`: transfer ERC-20 allowance through the x402 flow
- `brickken tx`: raw prepare, sign, send, status, and one-shot execute flows

## Raw Transaction Flow

Use `brickken tx` when you want full control over the payload or you need to call a specific backend method directly.

One-shot execution:

```bash
brickken tx prepare \
  --method agentCreateToken \
  --file token.json \
  --execute \
  --json
```

Supported agentic token methods include:

- `agentCreateToken`
- `agentMintToken`
- `agentBurnToken`
- `agentTransferToken`
- `agentTransferFromToken`
- `agentApproveToken`
- `agentApprove` as a CLI alias that normalizes to `agentApproveToken`

For manual control:

```bash
brickken tx prepare --method agentRegister --file agent-register.json --json
brickken tx sign --file prepared.json --json
brickken tx send --tx-id 0xPreparedTxId --signed-tx 0xSignedRawTx --json
```

| Command | Purpose | Typical usage |
| --- | --- | --- |
| `brickken tx prepare` | Prepare a raw transaction payload | Agentic methods and custom API V2 methods |
| `brickken tx sign` | Sign a transaction locally | Manual debugging and step-by-step flows |
| `brickken tx send` | Send signed transaction payloads | Manual debugging and step-by-step flows |
| `brickken tx status` | Look up a broadcast transaction by hash | Post-send tracking |

For `brickken tx prepare --execute`, the CLI:

1. prepares the transaction with `/prepare-transactions`
2. signs locally with the configured private key
3. sends the signed payload to `/send-transactions`

Example:

```bash
brickken tx prepare \
  --method agentSetMetadata \
  --file metadata.json \
  --execute \
  --json
```

Keep using the explicit `tx sign` / `tx send` path when you want full manual control over each step or need to inspect the unsigned payload before broadcasting.

## Configuration

Global flags:

- `--env <sandbox|production>`
- `--base-url <url>`
- `--private-key <key>`
- `--rpc-url <url>`
- `--env-file <path>`
- `--json`

Environment variables:

- `BRICKKEN_PRIVATE_KEY` or `BKN_PRIVATE_KEY`
- `BRICKKEN_BASE_URL` or `BKN_BASE_URL`
- `BRICKKEN_RPC_URL` or `BKN_RPC_URL`
- `BRICKKEN_ENV` or `BKN_ENV`

The CLI automatically loads `.env` from the current working directory unless `--env-file` is provided.

## Build Locally

```bash
pnpm install
pnpm build
node dist/index.js --help
```
