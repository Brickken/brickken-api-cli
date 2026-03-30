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
npm install -g @brickken/cli
```

```bash
pnpm add -g @brickken/cli
```

## Build Locally

```bash
pnpm install
pnpm build
node dist/index.js --help
```

## Publish to npm

```bash
pnpm publish --access public
```

Or via script:

```bash
pnpm run publish:public
```

## Automated publish (GitHub Actions)

This repository includes a workflow at `.github/workflows/publish-npm.yml`.

- publishes automatically when a tag matching `v*` is pushed (e.g. `v0.1.1`)
- can also be triggered manually with `workflow_dispatch`
- requires a repository secret named `NPM_TOKEN` with publish permissions for `@brickken/cli`

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
brickken tx status --hash 0x1234
```

## Configuration

Global flags:

- `--env <sandbox|production>`
- `--base-url <url>`
- `--api-key <key>`
- `--private-key <key>`
- `--env-file <path>`
- `--json`

The CLI automatically loads `.env` from the current working directory unless `--env-file` is provided.
