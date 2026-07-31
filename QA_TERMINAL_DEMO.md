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
- RAMS principal compliance check
- RAMS mandate grant through a relayed EIP-712 signature
- RAMS mandate inspection
- RAMS execution preflight
- RAMS executor call

RAMS is the Regulated Agent Mandate Standard (ERC-8226): a principal grants an agent a scoped, time-bounded, value-capped authority over a specific asset. The RAMS steps are optional and only run on Ethereum Sepolia; see the prerequisite note in step 10 before starting them.

## Prerequisites

Before starting, make sure QA has all of the following:

- `brickken-cli` installed globally or otherwise reachable on `PATH`
- `jq` installed locally
- a wallet private key exported as `BRICKKEN_PRIVATE_KEY`
- the matching wallet address available
- Sepolia ETH for gas
- Sepolia USDC for x402 payments
- the API base URL for the environment under test
- a working RPC URL for the chain under test

This demo is x402-based. Do not use or export API keys. Transaction writes ignore `BRICKKEN_API_KEY` and `BKN_API_KEY` entirely, and leaving them unset is what makes the RAMS read steps exercise the x402 payment path instead of API-key authentication.

Budget Sepolia USDC for prepare and send charges. Each executed command can consume roughly `0.02 USDC` because both prepare and send are x402-priced. Each RAMS read (`compliance-status`, `inspect`, `can-execute`) and each online `rams sign` adds about `0.001 USDC`. For the full extended flow below, keep at least `0.25 USDC` available to absorb retries; add another `0.05 USDC` if you run the RAMS steps.

## Recommended CLI Version

Install the latest published CLI and verify the version:

```bash
npm install -g brickken-cli@latest
brickken --version
```

Use `0.4.10` or newer. `0.4.5` introduced the top-level `create-token`, `mint`, `burn`, `approve`, `transfer`, and `transfer-from` commands; `0.4.10` is the first version whose bundled docs and skill reflect the `brickken rams` command group with x402-payable reads, so the RAMS steps below assume it.

If the CLI is older, top-level token commands may still call legacy non-agentic methods and return `401 API key is required for this method`.

If `brickken --version` still prints an older version after installing, check which binary your shell is using:

```bash
command -v brickken
npm ls -g brickken-cli --depth=0
```

When using `nvm`, global packages are installed per Node.js version. Re-run `npm install -g brickken-cli@latest` after switching Node versions with `nvm use`.

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

Variables for the optional RAMS steps. For a single-key smoke test the agent and the principal can be the same wallet:

```bash
export AGENT="$WALLET"
export PRINCIPAL="$WALLET"
export IDENTITY_REF="0x0000000000000000000000000000000000000000000000000000000000000001"
export VALID_UNTIL="$(( $(date +%s) + 2592000 ))"
```

`ASSET` is the ERC-20 the mandate authorizes. Reuse the token deployed in step 4 once `TOKEN_ADDRESS` is set:

```bash
export ASSET="$TOKEN_ADDRESS"
```

Sanity checks:

```bash
brickken --version
brickken approve --help >/dev/null
brickken transfer --help >/dev/null
brickken transfer-from --help >/dev/null
brickken rams --help >/dev/null
test -n "$BRICKKEN_PRIVATE_KEY" && echo "private key ok" || echo "private key missing"
test -n "$BRICKKEN_RPC_URL" && echo "rpc ok" || echo "rpc missing"
command -v jq
```

Environment note:

- Prefer `sandbox` or another environment with agent persistence enabled for the full agent flow.
- Some non-persistent development environments can accept `agent register` on-chain but fail `set-uri` or `set-metadata` later if the backend cannot resolve the returned `agentUuid`.
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

## 10. Check RAMS Principal Compliance

Read this before running any RAMS step. A mandate can only be granted to a principal that is already eligible on the ComplianceProvider. Making a principal eligible is `brickken rams grant-principal`, which must be signed by the compliance provider owner. QA does not normally hold that key, so treat this step as a gate: if the principal is not eligible, stop and ask the backend team to grant it rather than trying to grant it yourself.

RAMS is deployed on Ethereum Sepolia only, so keep `CHAIN` at `11155111` for steps 10 to 14.

```bash
brickken --base-url "$BASE_URL" rams compliance-status \
  --chain "$CHAIN" \
  --principal "$PRINCIPAL" \
  --identity-ref "$IDENTITY_REF" \
  --json | tee rams-compliance-output.json
```

Expected result:

- `eligible` is `true`
- if `eligible` is `false`, read `reason` and stop here

This is a read, so no API key is exported and the CLI settles roughly `0.001 USDC` through x402 instead.

## 11. Sign the Mandate Typed Data

The principal signs the EIP-712 `grantMandate` envelope locally. `--action 0x23b872dd` is the `transferFrom` selector, which is what step 14 exercises.

```bash
brickken --base-url "$BASE_URL" rams sign \
  --operation grant-mandate \
  --chain "$CHAIN" \
  --agent "$AGENT" \
  --principal "$PRINCIPAL" \
  --valid-until "$VALID_UNTIL" \
  --identity-ref "$IDENTITY_REF" \
  --asset "$ASSET" \
  --max-transaction-value 1000000 \
  --max-cumulative-value 5000000 \
  --action 0x23b872dd \
  --json | tee rams-signature.json
```

Expected result:

- `signature` and `deadline` are both present

```bash
jq -r '.signature' rams-signature.json
jq -r '.deadline' rams-signature.json
```

Do not continue if either value is empty.

## 12. Grant the Mandate

Submit the signed envelope in relayed mode. `--signer-address` is deliberately omitted: Brickken supplies its own operation signer, and the configured private key only authorizes the x402 payment.

```bash
brickken --base-url "$BASE_URL" rams grant \
  --chain "$CHAIN" \
  --agent "$AGENT" \
  --principal "$PRINCIPAL" \
  --valid-until "$VALID_UNTIL" \
  --identity-ref "$IDENTITY_REF" \
  --asset "$ASSET" \
  --max-transaction-value 1000000 \
  --max-cumulative-value 5000000 \
  --action 0x23b872dd \
  --signature "$(jq -r .signature rams-signature.json)" \
  --deadline "$(jq -r .deadline rams-signature.json)" \
  --execution-mode brickken-relayed \
  --execute \
  --json | tee rams-grant-output.json
```

Expected result:

- `sent.success` is `true`

## 13. Inspect the Mandate

```bash
brickken --base-url "$BASE_URL" rams inspect \
  --chain "$CHAIN" \
  --agent "$AGENT" \
  --principal "$PRINCIPAL" \
  --json | tee rams-inspect-output.json
```

Expected result:

- `status` is `active`
- `frozen` is `false`
- the returned caps match the values sent in step 12

## 14. Preflight and Run an Execution

Preflight first. `can-execute` returns the authoritative on-chain result plus a per-check breakdown that explains any refusal:

```bash
brickken --base-url "$BASE_URL" rams can-execute \
  --chain "$CHAIN" \
  --agent "$AGENT" \
  --principal "$PRINCIPAL" \
  --asset "$ASSET" \
  --amount 1000 \
  --selector 0x23b872dd \
  --json | tee rams-can-execute-output.json
```

Expected result:

- `canExecute` is `true`; if it is `false`, read the per-check breakdown before changing anything

Then run the executor call. This one is signed by the agent and is never Brickken-relayed, so `--signer-address` is required:

```bash
brickken --base-url "$BASE_URL" rams execute \
  --chain "$CHAIN" \
  --signer-address "$AGENT" \
  --asset "$ASSET" \
  --from "$PRINCIPAL" \
  --to "$RECIPIENT_WALLET" \
  --amount 1000 \
  --execute \
  --json | tee rams-execute-output.json
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

If the RAMS steps were run, also:

- one `rams compliance-status` reporting `eligible` `true`
- one signed mandate envelope from `rams sign`
- one successful `rams grant`
- one `rams inspect` reporting `status` `active`
- one `rams can-execute` reporting `canExecute` `true`
- one successful `rams execute`

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

RAMS checks:

```bash
jq -r '.eligible' rams-compliance-output.json
jq -r '.signature // empty' rams-signature.json
jq -r '.sent.success' rams-grant-output.json
jq -r '.status' rams-inspect-output.json
jq -r '.canExecute' rams-can-execute-output.json
jq -r '.sent.success' rams-execute-output.json
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

`eligible` is `false` from `rams compliance-status`

- The principal is not registered on the ComplianceProvider, or its eligibility expired.
- Read `reason` for the specific code.
- Do not continue to `rams grant`. Granting eligibility is `rams grant-principal`, which requires the compliance provider owner key.

`status` is `none` from `rams inspect`

- No mandate exists for that exact agent/principal pair on that chain.
- Check `rams-grant-output.json` first: if `sent.success` is `false`, the grant never landed.
- Confirm `AGENT` and `PRINCIPAL` are the same values used in steps 11 and 12. A mandate is keyed on the pair, so a single mismatched address reads as no mandate.

`canExecute` is `false` from `rams can-execute`

- Read the per-check breakdown in the response instead of guessing; it names the failing check.
- Common causes: the amount exceeds `maxTransactionValue`, the cumulative total exceeds `maxCumulativeValue`, the mandate is expired or not yet valid, the agent is frozen, or the selector is not in the mandate's allowed actions.

`rams execute` is rejected for an unsupported selector

- The AgentExecutor has no registered ActionSpec for that selector.
- Confirm with `brickken rams executor-action --chain "$CHAIN" --selector 0x23b872dd --json` and check `supported`.
- Registering one is `rams set-action`, which requires the executor owner key.

RAMS commands fail on a non-Sepolia chain

- RAMS is deployed on Ethereum Sepolia only. Keep `CHAIN` at `11155111`.
- The backend resolves the AgentMandate, ComplianceProvider, and AgentExecutor addresses per chain, so other chains have no contracts configured.
