# CLI Reference

The CLI package is `brickken-cli`; the binary is `brickken`.

Install:

```bash
npm install -g brickken-cli
```

Run without global install:

```bash
npx brickken-cli --help
```

## Auth and Config

The CLI is x402-only and ignores `BRICKKEN_API_KEY` / `BKN_API_KEY`.

```bash
export BRICKKEN_PRIVATE_KEY=0x...
export BRICKKEN_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
```

Aliases:

| Variable | Alias | Purpose |
| --- | --- | --- |
| `BRICKKEN_PRIVATE_KEY` | `BKN_PRIVATE_KEY` | x402 + transaction signing |
| `BRICKKEN_RPC_URL` | `BKN_RPC_URL` | Receipt polling |
| `BRICKKEN_BASE_URL` | `BKN_BASE_URL` | API base override |
| `BRICKKEN_ENV` | `BKN_ENV` | `sandbox` or `production` |

Global flags: `--env`, `--base-url`, `--private-key`, `--rpc-url`, `--env-file`, `--json`.

## Commands

| Command | Method | Purpose |
| --- | --- | --- |
| `brickken agent register` | `agentRegister` | Register ERC-8004 agent |
| `brickken agent set-uri` | `agentSetURI` | Update profile URI |
| `brickken agent set-metadata` | `agentSetMetadata` | Write metadata |
| `brickken agent set-wallet` | `agentSetWallet` | Update wallet |
| `brickken agent feedback give` | `agentGiveFeedback` | Give feedback |
| `brickken agent feedback revoke` | `agentRevokeFeedback` | Revoke feedback |
| `brickken agent feedback respond` | `agentAppendFeedbackResponse` | Respond to feedback |
| `brickken create-token` | `agentCreateToken` | Deploy agent ERC-20 |
| `brickken mint` | `agentMintToken` | Mint agent token |
| `brickken burn` | `agentBurnToken` | Burn agent token |
| `brickken transfer` | `agentTransferToken` | Transfer token |
| `brickken transfer-from` | `agentTransferFromToken` | Transfer through allowance |
| `brickken approve` | `agentApproveToken` | Approve allowance |
| `brickken tx prepare --method <method>` | any | Raw prepare/execute |
| `brickken tx sign` | local | Sign prepared tx JSON |
| `brickken tx send` | `/send-transactions` | Send signed tx |
| `brickken tx status` | `/get-transaction-status` | Poll status |

High-level commands are prepare-only by default. Add `--execute` to prepare, sign, send, and pay through x402. Add `--json` for automation.

## Examples

Register:

```bash
brickken agent register \
  --chain 11155111 \
  --signer-address "$WALLET" \
  --name "Research Agent" \
  --description "On-chain AI research agent" \
  --image https://example.com/agent.png \
  --service-name A2A \
  --service-endpoint https://agent.example/.well-known/agent-card.json \
  --x402-support true \
  --execute \
  --json
```

Create token:

```bash
brickken create-token \
  --chain 11155111 \
  --signer-address "$WALLET" \
  --name "Research Agent Token" \
  --symbol RAGT \
  --agent-wallet "$WALLET" \
  --premint 1000 \
  --execute \
  --json
```

Use `--file payload.json` for nested metadata or automation-generated payloads.
