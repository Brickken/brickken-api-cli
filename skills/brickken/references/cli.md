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

Writes use x402 and never send an API key. KYC link creation always requires an API key. Agent getters and RAMS reads/typed-data fetches use an API key when one is configured (`BRICKKEN_API_KEY` / `BKN_API_KEY`); otherwise they pay through x402. Agent getters cost 0.000001 USDC and RAMS reads cost 0.001 USDC.

```bash
export BRICKKEN_API_KEY=...
export BRICKKEN_PRIVATE_KEY=0x...
export BRICKKEN_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
```

Aliases:

| Variable | Alias | Purpose |
| --- | --- | --- |
| `BRICKKEN_API_KEY` | `BKN_API_KEY` | Required for KYC links; optional for agent getters and RAMS reads, which otherwise pay through x402 |
| `BRICKKEN_PRIVATE_KEY` | `BKN_PRIVATE_KEY` | x402 + transaction signing |
| `BRICKKEN_RPC_URL` | `BKN_RPC_URL` | Receipt polling |
| `BRICKKEN_BASE_URL` | `BKN_BASE_URL` | API base override |
| `BRICKKEN_ENV` | `BKN_ENV` | `forge`, `sandbox`, or `production` (`forge` targets `https://d4aqanatl1.execute-api.eu-west-1.amazonaws.com/forge`) |

Global flags: `--env`, `--base-url`, `--api-key`, `--private-key`, `--rpc-url`, `--env-file`, `--json`.

## Commands

| Command | Method | Purpose |
| --- | --- | --- |
| `brickken kyc create-link` | `POST /create-kyc-link` | Create or reuse an investor and return a KYC verification link |
| `brickken agent list` | `GET /get-agents` | List API-key-scoped or x402 owner-scoped agents |
| `brickken agent info` | `GET /get-agent-info` | Get an agent by UUID or on-chain ID and chain |
| `brickken agent transactions` | `GET /get-agent-transactions` | List an agent's transactions with pagination |
| `brickken agent register` | `agentRegister` | Register ERC-8004 agent |
| `brickken agent set-uri` | `agentSetURI` | Update profile URI |
| `brickken agent set-metadata` | `agentSetMetadata` | Write metadata |
| `brickken agent set-wallet` | `agentSetWallet` | Update wallet |
| `brickken agent transfer-ownership` | `agentTransferOwnership` | Transfer agent ownership |
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
| `brickken skill path` | local | Print the bundled Brickken skill path |
| `brickken skill install` | local | Copy the bundled skill into a skills directory |

### RAMS — Regulated Agent Mandate Standard (ERC-8226)

RAMS lets a principal grant an agent a scoped, time-bounded, value-capped authority over a specific asset, enforced on-chain by `AgentMandate` (mandate registry), `ComplianceProvider` (principal eligibility), and `AgentExecutor` (the gated call surface). Currently deployed on Ethereum Sepolia only (`11155111`).

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
| `brickken rams executor-action` | `GET /rams/executor-action` | ActionSpec lookup (`supported`, `hasAmount`, `amountIndex`) |
| `brickken rams sign` | `GET /rams/typed-data/{operation}` or local file | Sign grant/revoke/extend/set-operator typed data locally |

All writes accept `--file`; add `--execute` for prepare → local transaction signing → send. `grant`, `revoke`, `extend`, and `set-operator` additionally accept `--signature`, `--deadline`, and `--execution-mode brickken-relayed`; omit `--signer-address` in that mode because Brickken supplies its operation signer.

The five read commands and the online form of `rams sign` use an API key when one is configured; without one they pay 0.001 USDC through x402 using the configured private key. `rams sign --typed-data-file envelope.json` signs an already-fetched envelope offline, so it needs neither an API key nor a payment. `rams grant` only succeeds for a principal already eligible on the ComplianceProvider: check with `rams compliance-status` first.

Values are raw base units. `max` and `unlimited` are accepted for uint256 caps. Actions accept a bytes32 value or a 4-byte selector; repeat `--action` or use a comma-separated value.

High-level commands are prepare-only by default. Add `--execute` to prepare, sign, send, and pay through x402. Add `--json` for automation.

KYC link creation requires `--email`; `--need-kyc` accepts `true` or `false` and defaults to `true` on the API. Agent detail and transaction calls require either `--agent-uuid`, or `--agent-id` with `--chain`. Agent list accepts `--chain`, `--owner-wallet-address`, `--limit`, and `--offset`. In x402 mode, both owner filters are required and the payment signer must match the owner wallet. Limits are 1-100 and offsets are non-negative.

## Examples

Create a KYC link:

```bash
brickken kyc create-link --email investor@example.com --need-kyc true --json
```

Read an agent and its transactions:

```bash
brickken agent info --agent-uuid "$AGENT_UUID" --json
brickken agent transactions --agent-uuid "$AGENT_UUID" --limit 20 --offset 0 --json
```

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
