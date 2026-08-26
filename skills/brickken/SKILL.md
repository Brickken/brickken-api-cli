---
name: brickken
description: Use Brickken dapp API, Agentic API, CLI, and MCP for tokenization, STO, ERC-8004 agent, reputation, agent-owned token, and ERC-8226 RAMS agent-mandate workflows. Use when Codex needs to help an AI agent choose between API-key access, x402/private-key access, the brickken CLI, or the Brickken MCP; grant, revoke, extend, or inspect a RAMS mandate; prepare or send Brickken transactions; explain required credentials; build safe command/API payloads; or troubleshoot Brickken API/CLI/MCP usage.
---

# Brickken

## Overview

Use this skill to route Brickken tasks to the correct surface:

- **dapp API**: API-key authenticated tokenization, STO, security-token, KYC-link, and read workflows.
- **Agentic API**: x402-paid ERC-8004 agent identity, reputation, agent-owned ERC-20, RAMS mandate, and API-key-or-x402 agent getter workflows.
- **BKN faucet**: Sandbox/Forge 100 BKN claims through an API key or a 0.01 USDC x402 payment.
- **CLI**: local terminal execution for Agentic API flows, bundled as `brickken-cli`.
- **MCP**: MCP-compatible AI agent interface for dapp API and Agentic API tools.

**RAMS** is the Regulated Agent Mandate Standard (ERC-8226): a principal grants an agent a scoped, time-bounded, value-capped authority over a specific asset, enforced on-chain by `AgentMandate`, `ComplianceProvider`, and `AgentExecutor`. It is available on Ethereum Sepolia only (`11155111`), through `brickken rams` on the CLI and the `rams_*` MCP tools.

Never ask the user to paste secrets into chat. Use environment variable placeholders (`BRICKKEN_API_KEY`, `BRICKKEN_PRIVATE_KEY`) and explain where the agent/runtime must configure them.

## Surface Selection

1. If the user has a Brickken API key and needs tokenization/STO/security-token or KYC-link operations, use the **dapp API**. Read `references/dapp-api.md` and the KYC section of `references/agentic-api.md`.
2. If the user has no API key and wants ERC-8004 agent or agent-token operations, use the **Agentic API** with x402/private-key signing. Read `references/agentic-api.md`.
3. If a shell is available and the task is Agentic API execution, prefer the **CLI**. Read `references/cli.md`.
4. If the user is in an MCP-compatible agent surface or explicitly asks for MCP, use the **Brickken MCP**. Read `references/mcp.md`.
5. If the task is about delegating authority to an agent, mandate lifecycle, execution caps, freezing an agent, or principal compliance, it is a **RAMS** task. Read the RAMS section of `references/cli.md` for commands or `references/mcp.md` for tools, and `references/agentic-api.md` for the raw endpoints.
6. If no API key, no private key, and no configured MCP session exists, stop before execution and explain which credential/surface is missing.

## Credential Rules

- `BRICKKEN_API_KEY`: required for dapp API and KYC link creation. Do not use it for CLI x402 writes. It is optional for agent getters and RAMS reads/typed-data fetches, which fall back to x402 when it is absent.
- `BRICKKEN_PRIVATE_KEY` / `BKN_PRIVATE_KEY`: Agentic API x402 payment signing and transaction signing. Never print it.
- `BRICKKEN_RPC_URL` / `BKN_RPC_URL`: optional receipt lookup RPC, especially for `create-token --execute`.
- `BRICKKEN_ENV`: `forge`, `sandbox`, or `production`. Default CLI environment is `sandbox`; `forge` targets `https://d4aqanatl1.execute-api.eu-west-1.amazonaws.com/forge`.
- The BKN faucet accepts exactly one of API key or private key. Preserve its returned UUID v4 for retries; generate a new UUID for each new logical claim.

## Execution Workflow

Before preparing or sending any on-chain action:

1. Confirm target environment and chain.
2. Confirm signer wallet, token symbol or token address, recipients, amounts, and decimals.
3. State expected x402/API requirements and irreversible on-chain risk.
4. Use `--json` for CLI automation and preserve `txId`, `agentUuid`, `tokenAddress`, and transaction hashes.
5. Do not continue dependent operations until required outputs exist. For example, do not mint an agent token unless `tokenAddress` was returned.

## Quick Patterns

API-key dapp prepare flow:

```bash
curl --request POST 'https://api.sandbox.brickken.com/prepare-transactions' \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: $BRICKKEN_API_KEY' \
  --data '{"chainId":"11155111","method":"newTokenization","signerAddress":"0x..."}'
```

Agentic CLI execution flow:

```bash
export BRICKKEN_PRIVATE_KEY=0x...
brickken agent register --chain 11155111 --signer-address 0x... --name "Agent" --description "..." --image https://example.com/agent.png --execute --json
```

MCP configuration flow:

```json
{
  "env": "sandbox",
  "apiKey": "YOUR_BRICKKEN_API_KEY"
}
```

or:

```json
{
  "env": "sandbox",
  "privateKey": "0xYOUR_PRIVATE_KEY",
  "apiKey": ""
}
```

## Reference Files

- `references/dapp-api.md`: API-key endpoints, prepare/sign/send, reads.
- `references/agentic-api.md`: x402 flow, facade endpoints (including RAMS), RAMS reads and typed data, method fields, pricing.
- `references/cli.md`: CLI installation, env vars, commands, the `brickken rams` command table, examples.
- `references/mcp.md`: hosted MCP URL, session configuration, tool names (including `rams_*`).
