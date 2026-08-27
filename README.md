# Brickken CLI

Public CLI for the [Brickken](https://brickken.com) Dapp API, Agentic API, KYC, faucet, and RAMS workflows.

It covers:

- API-key-authenticated Dapp API transaction and JSON endpoint workflows
- ERC-8004 agent identity operations
- ERC-8004 reputation feedback operations
- ERC-8226 RAMS mandate lifecycle, compliance, executor, read, and EIP-712 signing operations
- x402-capable agentic token create, mint, burn, transfer, transfer-from, and approve operations
- raw transaction preparation, signing, sending, and one-shot execution

Repository: https://github.com/Brickken/brickken-api-cli

## Install

```bash
npm install -g brickken-cli
```

## AI Agent Skill

The npm package includes the Brickken Codex skill at `skills/brickken`.

Install it into the default Codex skills directory:

```bash
brickken skill install
```

Install it into a custom skills directory:

```bash
brickken skill install --path ~/.codex/skills --force
```

Print the bundled skill path:

```bash
brickken skill path
```

## Authentication

Dapp API requests use `BRICKKEN_API_KEY`. Agentic and RAMS client-controlled requests use the API key when configured, or x402 otherwise. `brickken-relayed` sends always use x402 because Brickken is the transaction relayer. KYC link creation requires an API key. Agent getters cost 0.000001 USDC through x402; RAMS reads cost 0.001 USDC:

```bash
export BRICKKEN_API_KEY=...
```

Provide a private key for local transaction signing and x402 payment signing:

```bash
export BRICKKEN_PRIVATE_KEY=0x...
```

## Sandbox BKN Faucet

Request 100 BKN on Ethereum Sepolia with either an API key (10 dedicated lifetime claims, separate from `mintToken`) or a private key that pays 0.01 USDC through x402:

```bash
brickken faucet bkn \
  --recipient-address 0x1111111111111111111111111111111111111111 \
  --json
```

The CLI generates a UUID v4 and returns it as `idempotencyKey`. To retry the same logical claim, reuse it explicitly:

```bash
brickken faucet bkn \
  --recipient-address 0x1111111111111111111111111111111111111111 \
  --idempotency-key 4d0f91d8-453d-4fb5-a8e1-c722bc7b75a1 \
  --json
```

Use a new UUID for a new claim; the same UUID with another recipient is rejected. Recipients have a 24-hour cooldown. This command is for Sandbox/Forge and exposes API-key or x402 auth only, not the public bearer flow. Do not configure both `--api-key` and `--private-key` for it.

## Dapp API

Use the CLI with an API key for legacy Dapp API tokenization, STO, security-token, and read workflows. Transaction methods use `brickken tx prepare` and `brickken tx send`; read endpoints use `brickken dapp get`. Use `brickken dapp request` for JSON POST or PATCH endpoints.

Prepare a tokenization with a payload file:

```bash
export BRICKKEN_API_KEY=...

brickken tx prepare \
  --method newTokenization \
  --file new-tokenization.json \
  --json
```

Read token information:

```bash
brickken dapp get \
  --path /get-token-info \
  --query tokenSymbol=EXMPL \
  --json
```

The CLI preserves the Dapp API prepare → sign → send flow. The signer wallet must be whitelisted, and the API key must have credits and access to the requested token or method. Multipart file uploads such as `/patch-token-docs` remain REST-only.

## Quick Start

The high-level commands are wallet-first and prepare-only by default. With an API key, client-controlled requests use API-key authentication; without one, x402 is used for eligible Agentic API methods. Add `--execute` to prepare, sign locally, and send in one step. Relayed sends always use x402.

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
- `brickken dapp`: API-key-authenticated Dapp API GET and JSON request operations
- `brickken kyc`: API-key-authenticated investor KYC link creation
- `brickken rams`: ERC-8226 mandate lifecycle, executor/compliance administration, reads, and EIP-712 signing
- `brickken create-token`: deploy an agentic ERC-20 through the x402 flow
- `brickken mint`: mint an agentic ERC-20 through the x402 flow
- `brickken burn`: burn an agentic ERC-20 through the x402 flow
- `brickken approve`: approve ERC-20 allowance through the x402 flow
- `brickken transfer`: transfer ERC-20 tokens through the x402 flow
- `brickken transfer-from`: transfer ERC-20 allowance through the x402 flow
- `brickken tx`: raw prepare, sign, send, status, and one-shot execute flows

## KYC and Agent Getters

Create or reuse an investor and return a Sumsub verification link. This command always requires `BRICKKEN_API_KEY`:

```bash
brickken kyc create-link \
  --email investor@example.com \
  --need-kyc true \
  --json
```

List agents visible to the API key, then fetch a profile and its transaction history:

```bash
brickken agent list --chain 84532 --limit 20 --offset 0 --json
brickken agent info --agent-uuid "$AGENT_UUID" --json
brickken agent transactions --agent-uuid "$AGENT_UUID" --limit 20 --offset 0 --json
```

Agent getters accept either API-key authentication or x402. In x402 mode, `agent list` requires both `--chain` and `--owner-wallet-address`, and the payment signer must own that wallet. Detail and transaction calls accept either `--agent-uuid`, or `--agent-id` together with `--chain`. Pagination limits are 1-100 and offsets must be non-negative.

## RAMS Mandate Flow

**RAMS** is the **Regulated Agent Mandate Standard** (ERC-8226): a principal grants an agent a scoped, time-bounded, value-capped authority over a specific asset, enforced on-chain by `AgentMandate` (the mandate registry), `ComplianceProvider` (principal eligibility), and `AgentExecutor` (the gated call surface). It is currently deployed on Ethereum Sepolia only (`11155111`).

`brickken rams` exposes ten write commands, five API-key-or-x402 read commands, and local EIP-712 signing. Writes prepare only by default; add `--execute` to sign/send and settle x402. Online typed-data fetching follows the same API-key-or-0.001-USDC-x402 policy.

A mandate can only be granted to a principal that is already eligible on the ComplianceProvider. Check that first, because `rams grant-principal` requires the provider owner key:

```bash
brickken rams compliance-status \
  --chain 11155111 \
  --principal "$PRINCIPAL" \
  --identity-ref "$IDENTITY_REF" \
  --json
```

Fetch typed data and sign it with the principal key:

```bash
brickken rams sign \
  --operation grant-mandate \
  --chain 11155111 \
  --agent "$AGENT" \
  --principal "$PRINCIPAL" \
  --valid-until 1789000000 \
  --identity-ref "$IDENTITY_REF" \
  --asset "$ASSET" \
  --max-transaction-value 1000000 \
  --max-cumulative-value 5000000 \
  --action 0x23b872dd \
  --json > rams-signature.json
```

Then request Brickken-relayed execution (omit `--signer-address`; the backend supplies its operation signer):

```bash
brickken rams grant \
  --chain 11155111 \
  --agent "$AGENT" \
  --principal "$PRINCIPAL" \
  --valid-until 1789000000 \
  --identity-ref "$IDENTITY_REF" \
  --asset "$ASSET" \
  --max-transaction-value 1000000 \
  --max-cumulative-value 5000000 \
  --action 0x23b872dd \
  --signature "$(jq -r .signature rams-signature.json)" \
  --deadline "$(jq -r .deadline rams-signature.json)" \
  --execution-mode brickken-relayed \
  --execute --json
```

The private key configured for this second command authorizes the x402 payment; it does not need to be the principal key.

Inspect the resulting mandate. The CLI sends the configured API key when available; without one, it uses the configured private key to pay 0.001 USDC through x402:

```bash
brickken rams inspect --chain 11155111 --agent "$AGENT" --principal "$PRINCIPAL" --json
```

Preflight an execution before spending gas on it. `can-execute` returns the authoritative on-chain `canExecute` result plus a per-check breakdown explaining any refusal:

```bash
brickken rams can-execute \
  --chain 11155111 \
  --agent "$AGENT" \
  --principal "$PRINCIPAL" \
  --asset "$ASSET" \
  --amount 1000000 \
  --selector 0x23b872dd \
  --json
```

The other reads are `rams status` (freeze flag, current EIP-712 nonce, optional operator approval), `rams compliance-status` (principal eligibility), and `rams executor-action` (the AgentExecutor ActionSpec for a selector: `supported`, `hasAmount`, `amountIndex`).

Run `brickken rams --help` and `brickken rams <command> --help` for the complete input surface. Lifecycle signature mode is supported only by `grant`, `revoke`, `extend`, and `set-operator`; executor and admin operations are never Brickken-relayed.

## Raw Transaction Flow

Use `brickken tx` when you want full control over the payload or need to call a specific Dapp or Agentic API transaction method directly. If `BRICKKEN_API_KEY` is configured, the CLI sends it for client-controlled prepare and send requests.

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

Dapp API transaction methods include:

- `newTokenization`
- `newSto`
- `newInvest`
- `claimTokens`
- `closeOffer`
- `mintToken`
- `whitelist`
- `burnToken`
- `transferFrom`
- `transferTo`
- `approve`
- `dividendDistribution`

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

- `--env <forge|sandbox|production>` (`forge` resolves to `https://d4aqanatl1.execute-api.eu-west-1.amazonaws.com/forge`)
- `--base-url <url>`
- `--api-key <key>`
- `--private-key <key>`
- `--rpc-url <url>`
- `--env-file <path>`
- `--json`

Environment variables:

- `BRICKKEN_API_KEY` or `BKN_API_KEY` (Dapp API, KYC, faucet, agent getters, and RAMS reads/typed-data; also client-controlled transaction requests when configured)
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
