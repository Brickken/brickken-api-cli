---
name: brickken
description: Use Brickken dapp API, Agentic API, CLI, and MCP for tokenization, STO, ERC-8004 agent, reputation, and agent-owned token workflows. Use when Codex needs to help an AI agent choose between API-key access, x402/private-key access, the brickken CLI, or the Brickken MCP; prepare or send Brickken transactions; explain required credentials; build safe command/API payloads; or troubleshoot Brickken API/CLI/MCP usage.
---

# Brickken

## Overview

Use this skill to route Brickken tasks to the correct surface:

- **dapp API**: API-key authenticated tokenization, STO, security-token, and read workflows.
- **Agentic API**: x402-paid ERC-8004 agent identity, reputation, and agent-owned ERC-20 workflows.
- **CLI**: local terminal execution for Agentic API flows, bundled as `brickken-cli`.
- **MCP**: MCP-compatible AI agent interface for dapp API and Agentic API tools.

Never ask the user to paste secrets into chat. Use environment variable placeholders (`BRICKKEN_API_KEY`, `BRICKKEN_PRIVATE_KEY`) and explain where the agent/runtime must configure them.

## Surface Selection

1. If the user has a Brickken API key and needs tokenization/STO/security-token operations, use the **dapp API**. Read `references/dapp-api.md`.
2. If the user has no API key and wants ERC-8004 agent or agent-token operations, use the **Agentic API** with x402/private-key signing. Read `references/agentic-api.md`.
3. If a shell is available and the task is Agentic API execution, prefer the **CLI**. Read `references/cli.md`.
4. If the user is in an MCP-compatible agent surface or explicitly asks for MCP, use the **Brickken MCP**. Read `references/mcp.md`.
5. If no API key, no private key, and no configured MCP session exists, stop before execution and explain which credential/surface is missing.

## Credential Rules

- `BRICKKEN_API_KEY`: dapp API authentication. Do not use it for CLI x402 flows.
- `BRICKKEN_PRIVATE_KEY` / `BKN_PRIVATE_KEY`: Agentic API x402 payment signing and transaction signing. Never print it.
- `BRICKKEN_RPC_URL` / `BKN_RPC_URL`: optional receipt lookup RPC, especially for `create-token --execute`.
- `BRICKKEN_ENV`: `sandbox` or `production`. Default CLI environment is `sandbox`.

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
- `references/agentic-api.md`: x402 flow, facade endpoints, method fields, pricing.
- `references/cli.md`: CLI installation, env vars, commands, examples.
- `references/mcp.md`: hosted MCP URL, session configuration, tool names.
