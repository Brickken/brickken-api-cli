# Brickken CLI

Public CLI for the [Brickken](https://brickken.com) API.

It covers:

- ERC-8004 agent identity and x402-capable agent token operations
- standard tokenization flows
- STO lifecycle commands
- token operations
- read-only info queries
- raw transaction preparation, signing, sending, and one-shot execution

Repository: https://github.com/Brickken/brickken-api-cli

## Install

```bash
npm install -g brickken-cli
```

## Authentication

The CLI supports two authentication modes:

- Agent methods (`agent*`) can use x402 payment or an API key.
- Standard tokenization, token, STO, invest, claim, and on-behalf methods require an API key.

For x402 agent flows, do not pass `--api-key` and do not export `BRICKKEN_API_KEY` / `BKN_API_KEY`. Provide a private key for local transaction signing and x402 payment signing:

```bash
export BRICKKEN_PRIVATE_KEY=0x...
```

For API-key flows:

```bash
export BRICKKEN_API_KEY=...
```

## Agent Tokenization With x402 + Execute

The agent commands are designed for the common ERC-8004 path. `--execute` prepares the transaction, signs it locally, sends it, and automatically pays the API request with x402 when no API key is configured.

Register the agent:

```bash
brickken agent register \
  --chain 11155111 \
  --owner-email tokenizer@example.com \
  --signer-address 0xYourWallet \
  --name "Research Agent" \
  --description "On-chain research agent" \
  --image https://example.com/agent.png \
  --service-name A2A \
  --service-endpoint https://agent.example/.well-known/agent-card.json \
  --service-version 0.3.0 \
  --x402-support true \
  --execute \
  --json
```

After the registration transaction is confirmed, finalize the agent profile:

```bash
brickken agent set-uri \
  --chain 11155111 \
  --signer-address 0xYourWallet \
  --agent-uuid YOUR_AGENT_UUID \
  --execute \
  --json
```

Deploy an agent token:

```bash
brickken agent create-token \
  --chain 11155111 \
  --owner-email tokenizer@example.com \
  --signer-address 0xYourWallet \
  --name "Research Agent Token" \
  --symbol RAGT \
  --agent-wallet 0xYourWallet \
  --premint 1000 \
  --execute \
  --json
```

Use the returned `sent.results[0].result.tokenAddress` to mint more tokens:

```bash
brickken agent mint \
  --chain 11155111 \
  --owner-email tokenizer@example.com \
  --signer-address 0xYourWallet \
  --token-address 0xDeployedAgentToken \
  --to 0xRecipientWallet \
  --amount 100 \
  --execute \
  --json
```

You can also use the raw transaction surface for any method:

```bash
brickken tx prepare --method agentCreateToken --file agent-token.json --execute --json
```

## Command Groups

- `brickken agent`: ERC-8004 identity, reputation, and agent token operations. Supports x402 or API key.
- `brickken tokenization`: standard tokenization. API-key-only.
- `brickken token`: standard token mint, burn, transfer, approve, and docs operations. API-key-only.
- `brickken sto`: standard STO workflows. API-key-only.
- `brickken info`: read-only API queries.
- `brickken tx`: raw prepare, sign, send, status, and one-shot execute flows.

High-level write commands are prepare-only by default. Add `--execute` to prepare, sign locally, and send in one command.

## Raw Prepare, Sign, Send

For manual control:

```bash
brickken tx prepare --method agentRegister --file agent-register.json --json
brickken tx sign --file prepared.json --json
brickken tx send --tx-id 0xPreparedTxId --signed-tx 0xSignedRawTx --json
```

For one-shot execution:

```bash
brickken tx prepare --method agentRegister --file agent-register.json --execute --json
```

## Raw Transaction Flow

The `tx` command group is the lowest-level interface to the Brickken API V2 prepare/sign/send lifecycle.

| Command | Purpose | Typical usage |
| --- | --- | --- |
| `brickken tx prepare` | Prepare a raw transaction payload | Agentic methods and custom API V2 methods |
| `brickken tx sign` | Sign a prepared transaction locally | Manual debugging and step-by-step flows |
| `brickken tx send` | Send signed transaction payloads | Manual debugging and step-by-step flows |
| `brickken tx status` | Look up a broadcast transaction by hash | Post-send tracking |

For agentic methods, `brickken tx prepare --execute` is now the recommended one-shot flow because it:

1. prepares the transaction with `/prepare-transactions`
2. signs locally with the configured private key
3. sends the signed payload to `/send-transactions`

Example:

```bash
brickken tx prepare \
  --method erc8004RegisterAgent \
  --file agent-register.json \
  --execute
```

Keep using the explicit `tx sign` / `tx send` path when you want full manual control over each step or need to inspect the unsigned payload before broadcasting.

## Configuration

Global flags:

- `--env <sandbox|production>`
- `--base-url <url>`
- `--api-key <key>`
- `--private-key <key>`
- `--env-file <path>`
- `--json`

Environment variables:

- `BRICKKEN_PRIVATE_KEY` or `BKN_PRIVATE_KEY`
- `BRICKKEN_API_KEY` or `BKN_API_KEY`
- `BRICKKEN_BASE_URL` or `BKN_BASE_URL`
- `BRICKKEN_ENV` or `BKN_ENV`

The CLI automatically loads `.env` from the current working directory unless `--env-file` is provided.

## Build Locally

```bash
pnpm install
pnpm build
node dist/index.js --help
```

## Release

The npm publish workflow expects a tag that exactly matches `package.json`.

Example for version `0.3.0`:

```bash
git checkout main
git pull --ff-only
git tag -a v0.3.0 -m "Release v0.3.0"
git push origin v0.3.0
```

The publish workflow now validates that:

- the pushed tag is exactly `v<package.json version>`
- the target version is greater than the currently published npm version

You can also run the same guard locally:

```bash
RELEASE_TAG=v0.3.0 pnpm release:check
```
