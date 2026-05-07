# QA Terminal Demo

This document describes the QA flow for running the Brickken agentic CLI demo from a terminal.

The demo covers:

- ERC-8004 agent registration
- ERC-8004 agent profile update
- ERC-8004 agent metadata update
- agentic token deployment
- agentic token mint
- agentic token burn
- agentic token approval
- agentic token transfer
- agentic token transfer-from

## Prerequisites

Before starting, make sure QA has all of the following:

- `brickken-cli` installed locally
- `jq` installed locally
- a wallet private key exported as `BRICKKEN_PRIVATE_KEY`
- the matching wallet address available
- Sepolia ETH for gas
- Sepolia USDC for x402 payments
- the API base URL for the environment under test
- a working RPC URL for the chain under test

This demo is x402-based. Do not use or export API keys.

Budget enough Sepolia USDC for prepare and send charges. For the full extended flow below, keep at least `0.25 USDC` available to absorb retries.

## Recommended CLI Version

Install the latest published CLI and verify the version:

```bash
npm install -g brickken-cli@latest
brickken --version
```

Use a version that already includes the top-level `create-token`, `mint`, `burn`, `approve`, `transfer`, and `transfer-from` commands.

If the CLI is older, top-level token commands may still call legacy non-agentic methods and return `401 API key is required for this method`.

## Environment Setup

Replace the placeholder values before running the demo.

```bash
export BASE_URL="https://<environment-host>"
export CHAIN="11155111"
export WALLET="0xYourWallet"
export BRICKKEN_PRIVATE_KEY="0xYourPrivateKey"
export BRICKKEN_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
```

Optional helper variables:

```bash
export OWNER_EMAIL="owner@example.com"
export AGENT_NAME="QA Demo Agent"
export AGENT_DESCRIPTION="QA demo AI agent controlled from terminal"
export AGENT_IMAGE="https://placehold.co/512x512.png"
export SERVICE_NAME="A2A"
export SERVICE_ENDPOINT="https://agent.example/.well-known/agent-card.json"
export SERVICE_VERSION="0.3.0"
export RECIPIENT_WALLET="$WALLET"
export SPENDER_WALLET="$WALLET"
```

`OWNER_EMAIL` is optional for agentic methods. Keep it only if your environment wants an attribution email for tracing or analytics.

Sanity checks:

```bash
brickken --version
test -n "$BRICKKEN_PRIVATE_KEY" && echo "private key ok" || echo "private key missing"
test -n "$BRICKKEN_RPC_URL" && echo "rpc ok" || echo "rpc missing"
command -v jq
```

Environment note:

- Prefer `sandbox` or another environment with agent persistence enabled for the full agent flow.
- Some internal environments such as `stage2` can accept `agent register` on-chain but fail `set-uri` or `set-metadata` later if the backend does not persist the returned `agentUuid`.
- Public explorers such as 8004scan may not index internal development environments.

Input safety:

- `--json` is supported and recommended for QA capture.
- Quote every variable that may contain spaces.
- Prefer `--file` for nested JSON or large payloads instead of inlining JSON inside the shell.
- Do not continue from one step to the next if the exported variable for that step is empty.

## 1. Register the Agent

```bash
brickken --base-url "$BASE_URL" agent register \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --name "$AGENT_NAME" \
  --description "$AGENT_DESCRIPTION" \
  --image "$AGENT_IMAGE" \
  --service-name "$SERVICE_NAME" \
  --service-endpoint "$SERVICE_ENDPOINT" \
  --service-version "$SERVICE_VERSION" \
  --ai-model-provider OpenAI \
  --ai-model-name "QA Research Model" \
  --tag ai-agent \
  --tag qa-demo \
  --x402-support true \
  --active true \
  --execute \
  --json | tee register-output.json
```

Capture the agent UUID:

```bash
export AGENT_UUID="$(jq -r '.prepared.info.agentUuid // empty' register-output.json)"
echo "$AGENT_UUID"
```

Expected result:

- `prepared.info.agentUuid` is present
- `sent.success` is `true`

## 2. Set the Agent URI / Profile

```bash
brickken --base-url "$BASE_URL" agent set-uri \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --agent-uuid "$AGENT_UUID" \
  --name "$AGENT_NAME" \
  --description "QA demo AI agent with x402-paid terminal execution" \
  --image "$AGENT_IMAGE" \
  --service-name "$SERVICE_NAME" \
  --service-endpoint "$SERVICE_ENDPOINT" \
  --service-version "$SERVICE_VERSION" \
  --ai-model-provider OpenAI \
  --ai-model-name "QA Research Model" \
  --tag ai-agent \
  --tag qa \
  --tag terminal-demo \
  --documentation https://docs.brickken.com \
  --source-code https://github.com/Brickken/brickken-api-cli \
  --license MIT \
  --agent-type research \
  --supported-trust feedback \
  --x402-support true \
  --active true \
  --execute \
  --json | tee set-uri-output.json
```

Expected result:

- `prepared.info.agentURI` is present
- `sent.success` is `true`

## 3. Set Agent Metadata

```bash
brickken --base-url "$BASE_URL" agent set-metadata \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --agent-uuid "$AGENT_UUID" \
  --metadata-key capabilities \
  --metadata-value '{"tasks":["research","summarization","token-operations"],"demo":"qa-terminal"}' \
  --metadata-encoding json \
  --execute \
  --json | tee set-metadata-output.json
```

Expected result:

- `prepared.info.metadataKey` is `capabilities`
- `sent.success` is `true`

## 4. Create the Token

Prepare a unique symbol for each run:

```bash
export TOKEN_SYMBOL="QA$(date +%M%S)"
export TOKEN_NAME="QA Demo Token $TOKEN_SYMBOL"
```

Run token deployment:

```bash
brickken --base-url "$BASE_URL" create-token \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --name "$TOKEN_NAME" \
  --symbol "$TOKEN_SYMBOL" \
  --agent-wallet "$WALLET" \
  --premint 1000 \
  --decimals 18 \
  --execute \
  --json | tee create-token-output.json
```

Capture the token address:

```bash
export TOKEN_ADDRESS="$(jq -r '.tokenAddress // empty' create-token-output.json)"
echo "$TOKEN_ADDRESS"
```

Expected result:

- `sent.success` is `true`
- `tokenAddress` is present in the JSON output

## 5. Mint Tokens

```bash
brickken --base-url "$BASE_URL" mint \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address "$TOKEN_ADDRESS" \
  --to "$WALLET" \
  --amount 100 \
  --decimals 18 \
  --execute \
  --json | tee mint-output.json
```

Expected result:

- `sent.success` is `true`

## 6. Burn Tokens

```bash
brickken --base-url "$BASE_URL" burn \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address "$TOKEN_ADDRESS" \
  --from "$WALLET" \
  --amount 25 \
  --decimals 18 \
  --execute \
  --json | tee burn-output.json
```

Expected result:

- `sent.success` is `true`

## 7. Approve Allowance

For a single-key demo, using the same wallet as holder and spender is acceptable. Replace `SPENDER_WALLET` with a second wallet if you want a more realistic allowance flow.

```bash
brickken --base-url "$BASE_URL" approve \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address "$TOKEN_ADDRESS" \
  --spender-address "$SPENDER_WALLET" \
  --amount 50 \
  --decimals 18 \
  --execute \
  --json | tee approve-output.json
```

Expected result:

- `sent.success` is `true`

## 8. Transfer Tokens

```bash
brickken --base-url "$BASE_URL" transfer \
  --chain "$CHAIN" \
  --signer-address "$WALLET" \
  --token-address "$TOKEN_ADDRESS" \
  --to "$RECIPIENT_WALLET" \
  --amount 10 \
  --decimals 18 \
  --execute \
  --json | tee transfer-output.json
```

Expected result:

- `sent.success` is `true`

## 9. Transfer Tokens Through Allowance

This command exercises the `agentTransferFromToken` method. For a single-key smoke test, `SPENDER_WALLET` can still point to the same wallet.

```bash
brickken --base-url "$BASE_URL" transfer-from \
  --chain "$CHAIN" \
  --signer-address "$SPENDER_WALLET" \
  --token-address "$TOKEN_ADDRESS" \
  --from "$WALLET" \
  --to "$RECIPIENT_WALLET" \
  --amount 5 \
  --decimals 18 \
  --execute \
  --json | tee transfer-from-output.json
```

Expected result:

- `sent.success` is `true`

## Demo Checklist

At the end of the flow, QA should have:

- one successful `agent register`
- one successful `agent set-uri`
- one successful `agent set-metadata`
- one successful `create-token`
- one successful `mint`
- one successful `burn`
- one successful `approve`
- one successful `transfer`
- one successful `transfer-from`

Useful checks:

```bash
jq -r '.prepared.info.agentUuid // empty' register-output.json
jq -r '.prepared.info.agentURI // empty' set-uri-output.json
jq -r '.prepared.info.metadataKey // empty' set-metadata-output.json
jq -r '.tokenAddress // empty' create-token-output.json
jq -r '.sent.success' mint-output.json
jq -r '.sent.success' burn-output.json
jq -r '.sent.success' approve-output.json
jq -r '.sent.success' transfer-output.json
jq -r '.sent.success' transfer-from-output.json
```

## Troubleshooting

`401 API key is required for this method`

- The CLI is probably too old.
- Reinstall the latest `brickken-cli` and re-run the command.

`Payment verification failed: invalid_exact_evm_insufficient_balance`

- The wallet does not have enough Sepolia USDC for x402 payments.

`Endpoint request timed out`

- Retry the same command only if there is no successful send result in the output.
- If a transaction hash is already present, inspect that output before retrying.

`tokenAddress` is empty after `create-token`

- Check `create-token-output.json`.
- If `sent.success` is `false`, do not continue to mint or burn.
- If `sent.success` is `true` but `tokenAddress` is missing, make sure `BRICKKEN_RPC_URL` is set.

`name is required`, `tokenAddress is required`, or other missing-field validation errors

- First inspect the actual value before retrying:
  - `echo "$TOKEN_NAME"`
  - `echo "$TOKEN_ADDRESS"`
  - `echo "$AGENT_UUID"`
- Empty variables and bad shell quoting are more common than JSON output problems.
- If the payload contains nested JSON or long text, move it into a file and use `--file`.

`A stored tokenized agent reference is required via agentUuid or agentId`

- The backend environment accepted `agent register` but cannot resolve the stored agent reference for later mutations.
- Re-run the full agent flow against `sandbox` or another environment with agent persistence enabled.
