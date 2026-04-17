# Brickken CLI

Public CLI for the [Brickken](https://brickken.com) API.

It covers:

- tokenization flows
- STO lifecycle commands
- token operations
- read-only info queries
- raw transaction preparation, signing, and sending

The CLI is maintained as a standalone public repository.

Repository: https://github.com/Brickken/brickken-api-cli

## Install

```bash
npm install -g brickken-cli
```

```bash
pnpm setup
pnpm add -g brickken-cli
```

## Build Locally

```bash
pnpm install
pnpm build
node dist/index.js --help
```

## Authentication

The CLI supports both Brickken authentication modes:

- `BRICKKEN_API_KEY` for standard authenticated API access
- `BRICKKEN_PRIVATE_KEY` for local signing and x402 payment flows

You can also pass credentials directly with flags such as `--api-key` and `--private-key`.

## Examples

```bash
brickken info network --chain 1
brickken info token --token-symbol MST
brickken tokenization create --file params.json --execute
brickken sto invest --token-symbol MST --amount 1000 --execute
brickken tx prepare --method erc8004RegisterAgent --file agent.json --execute
brickken tx status --hash 0x1234
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

The CLI automatically loads `.env` from the current working directory unless `--env-file` is provided.

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
