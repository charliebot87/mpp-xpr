# AGENTS.md — mpp-xpr

XPR Network payment method plugin for the [Machine Payments Protocol](https://mpp.dev).

## Repo Layout

```
src/
  methods.ts    — charge method schema (name, intent, zod types)
  client.ts     — createClient() — signs XPR transfers on 402
  server.ts     — createServer() — verifies tx on-chain / via Hyperion
  index.ts      — public exports
  test.ts       — end-to-end test against XPR mainnet
examples/
  server.ts     — Express demo: free + 402-protected endpoints
  client.ts     — Auto-paying fetch() client wired to @proton/js
dist/           — compiled output (gitignored until publish)
```

## Key Facts

- **Package name:** `mpp-xpr` (npm)
- **mppx version:** see `package.json` — imports must match its ESM API
- **XPR RPC:** `https://api.protonnz.com`
- **Hyperion fallback:** `https://proton.eosusa.io/v2/history/get_transaction?id=<txHash>`
- **Explorer:** `https://explorer.xprnetwork.org`
- **Test TX:** `e8c67447d644b129ed5dc3384388453ff997b4c26581cd729f03d721d4627809`

## mppx API Quick Reference

### Defining a method
```ts
import { Method, z } from 'mppx'
Method.from({ name, intent, schema: { request: ZodSchema, credential: { payload: ZodSchema } } })
```

### Client side
`createCredential` **must return `Promise<string>`** — use `Credential.serialize(Credential.from({ challenge, payload }))`.

### Server side
`verify` **must return `Receipt.Receipt`** on success, and **throw** on failure (do NOT return `{ status: 'failed' }` — the Receipt schema only accepts `'success'`).
`Receipt.from()` requires a `reference` field (use the txHash).

### Import paths
```ts
import { Method, Receipt, Credential, z } from 'mppx'   // ✅
import * as z from 'mppx/zod'                            // ❌ no type declarations
```

## Build

```bash
npm run build    # tsc → dist/
```

## Test (mainnet)

```bash
node --loader ts-node/esm src/test.ts
```

## Publish Checklist

1. `npm run build` passes cleanly
2. Bump version in `package.json`
3. `npm publish --access public`

## Common Pitfalls

- `Receipt.from` only accepts `status: 'success'` — failures must throw
- `createCredential` returns serialized string, not a payload object
- `toServer` uses `verify`, NOT `verifyCredential`
- XPR amounts are 4 decimal places: `"1.0000 XPR"`
