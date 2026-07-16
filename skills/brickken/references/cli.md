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

Writes use x402 and never send an API key. RAMS reads and typed-data fetches require `BRICKKEN_API_KEY` / `BKN_API_KEY`.

```bash
export BRICKKEN_API_KEY=...
export BRICKKEN_PRIVATE_KEY=0x...
export BRICKKEN_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
```

Aliases:

| Variable | Alias | Purpose |
| --- | --- | --- |
| `BRICKKEN_API_KEY` | `BKN_API_KEY` | RAMS read and typed-data authentication |
| `BRICKKEN_PRIVATE_KEY` | `BKN_PRIVATE_KEY` | x402 + transaction signing |
| `BRICKKEN_RPC_URL` | `BKN_RPC_URL` | Receipt polling |
| `BRICKKEN_BASE_URL` | `BKN_BASE_URL` | API base override |
| `BRICKKEN_ENV` | `BKN_ENV` | `forge`, `sandbox`, or `production` (`forge` targets `https://forge.apigw.brickken.rocks/api`) |

Global flags: `--env`, `--base-url`, `--api-key`, `--private-key`, `--rpc-url`, `--env-file`, `--json`.

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

### RAMS (ERC-8226)

| Command | Backend operation | Signer / purpose |
| --- | --- | --- |
| `brickken rams grant` | `ramsGrantMandate` | Principal direct, or a relayer with principal EIP-712 signature |
| `brickken rams revoke` | `ramsRevokeMandate` | Principal/operator direct, or signed relay |
| `brickken rams extend` | `ramsExtendMandate` | Principal/operator direct, or signed relay |
| `brickken rams set-operator` | `ramsSetOperator` | Principal direct, or signed relay |
| `brickken rams execute` | `ramsExecute` | Agent; raw calldata or ERC-20 `transferFrom` helper |
| `brickken rams set-action` | `ramsSetExecutorAction` | AgentExecutor owner |
| `brickken rams freeze` | `ramsFreezeAgent` | `ENFORCER_ROLE` holder |
| `brickken rams unfreeze` | `ramsUnfreezeAgent` | `ENFORCER_ROLE` holder |
| `brickken rams grant-principal` | `ramsGrantPrincipal` | ComplianceProvider owner |
| `brickken rams revoke-principal` | `ramsRevokePrincipal` | ComplianceProvider owner |
| `brickken rams inspect` | `GET /rams/mandate` | Read mandate and derived status |
| `brickken rams can-execute` | `GET /rams/can-execute` | Preflight action/value allowance |
| `brickken rams status` | `GET /rams/status` | Freeze, nonce, and optional operator state |
| `brickken rams compliance-status` | `GET /rams/compliance-status` | Principal eligibility |
| `brickken rams executor-action` | `GET /rams/executor-action` | Selector/action registration |
| `brickken rams sign` | `GET /rams/typed-data/{operation}` or local file | Sign grant/revoke/extend/set-operator typed data locally |

All writes accept `--file`; add `--execute` for prepare → local transaction signing → send. `grant`, `revoke`, `extend`, and `set-operator` additionally accept `--signature`, `--deadline`, and `--execution-mode brickken-relayed`; omit `--signer-address` in that mode because Brickken supplies its operation signer. `rams sign --typed-data-file envelope.json` signs offline and does not require an API key.

Values are raw base units. `max` and `unlimited` are accepted for uint256 caps. Actions accept a bytes32 value or a 4-byte selector; repeat `--action` or use a comma-separated value.

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
