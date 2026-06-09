# MCP Reference

Hosted Brickken MCP page: `https://mcp.brickken.com/`

MCP endpoint for clients that require the transport URL: `https://mcp.brickken.com/mcp`

## Client Config

```json
{
  "mcpServers": {
    "brickken": {
      "url": "https://mcp.brickken.com/"
    }
  }
}
```

If the client requires the exact MCP transport endpoint, use `/mcp`.

## Session Config

API-key mode:

```json
{
  "env": "production",
  "apiKey": "YOUR_BRICKKEN_API_KEY"
}
```

x402/private-key mode:

```json
{
  "env": "sandbox",
  "privateKey": "0xYOUR_PRIVATE_KEY",
  "apiKey": ""
}
```

Use `get_config` after `configure`. It returns `env`, `baseUrl`, `hasApiKey`, and `hasPrivateKey`, not secret values.

## Tools

Configuration: `configure`, `get_config`.

Transactions: `prepare_transactions`, `send_transactions`, `get_transaction_status`.

dapp API tools:

- `create_tokenization`
- `create_sto`, `invest_in_sto`, `claim_sto`, `close_sto`
- `mint_tokens`, `whitelist_investor`, `burn_tokens`, `transfer_tokens`, `approve_tokens`, `distribute_dividend`
- `get_network_info`, `get_token_info`, `get_tokenizer_info`, `get_stos`, `get_sto_by_id`, `get_investments_by_sto_id`, `get_investor_info`, `get_allowance`, `get_whitelist_status`, `get_balance_whitelist`, `get_sto_balance`, `get_dividend_info`

Agentic tools:

- `agent_register`, `agent_set_uri`, `agent_set_metadata`, `agent_set_wallet`
- `agent_give_feedback`, `agent_revoke_feedback`, `agent_append_feedback_response`
- `agent_create_token`, `agent_mint_token`, `agent_burn_token`, `agent_transfer_token`, `agent_transfer_from_token`, `agent_approve_token`

Agent tools auto-sign/send when the session has a private key. If no API key is configured, eligible agentic calls use x402.
