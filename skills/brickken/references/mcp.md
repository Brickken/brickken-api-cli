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

The server exposes 63 tools.

Configuration: `configure`, `get_config`.

Transactions: `prepare_transactions`, `send_transactions`, `get_transaction_status`.

dapp API tools:

- `request_bkn_faucet` (Sandbox/Forge only; exactly one API key or private-key/x402 mode; optional UUID v4 is generated when omitted and returned for safe retries)
- `create_kyc_link` (API key required; can create an investor and send an invitation)
- `create_tokenization`
- `create_sto`, `invest_in_sto`, `claim_sto`, `close_sto`
- `mint_tokens`, `whitelist_investor`, `burn_tokens`, `transfer_tokens`, `approve_tokens`, `distribute_dividend`
- `get_network_info`, `get_token_info`, `get_tokenizer_info`, `get_stos`, `get_sto_by_id`, `get_investments_by_sto_id`, `get_investor_info`, `get_allowance`, `get_whitelist_status`, `get_balance_whitelist`, `get_sto_balance`, `get_dividend_info`

Agentic tools:

- `get_agents`, `get_agent_info`, `get_agent_transactions`
- `agent_register`, `agent_set_uri`, `agent_set_metadata`, `agent_set_wallet`
- `agent_give_feedback`, `agent_revoke_feedback`, `agent_append_feedback_response`
- `agent_create_token`, `agent_mint_token`, `agent_burn_token`, `agent_transfer_token`, `agent_transfer_from_token`, `agent_approve_token`

RAMS tools — Regulated Agent Mandate Standard (ERC-8226), Sepolia only:

- lifecycle: `rams_grant_mandate`, `rams_revoke_mandate`, `rams_extend_mandate`, `rams_set_operator`
- execution/admin: `rams_execute`, `rams_set_executor_action`, `rams_freeze_agent`, `rams_unfreeze_agent`, `rams_grant_principal`, `rams_revoke_principal`
- reads: `rams_get_mandate`, `rams_can_execute`, `rams_get_status`, `rams_check_compliance`, `rams_get_executor_action`
- EIP-712: `rams_get_typed_data`

Agent tools auto-sign/send when the session has a private key. If no API key is configured, eligible agentic calls use x402.

Agent getters accept API-key or x402 authentication. In x402 mode, `get_agents` requires `chainId` and `ownerWalletAddress`, and the payment signer must match the owner wallet. `create_kyc_link` always requires an API key; treat the returned Sumsub URL as sensitive.

RAMS reads and typed-data fetches use the session API key when one is configured; otherwise the session private key pays for the call through x402. `rams_get_typed_data` also signs the returned envelope when the session private key matches the expected principal; otherwise it returns the envelope with a warning for external signing. Only the four lifecycle tools accept `brickken-relayed`; omit `signerAddress` in that mode. The remaining RAMS writes are client-signed only.
