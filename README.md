# mpp-xpr

XPR Network payment method for the [Machine Payments Protocol (MPP)](https://mpp.dev).

Zero gas fees. Sub-second finality. Human-readable accounts. WebAuth wallet support.

[![npm](https://img.shields.io/npm/v/mpp-xpr)](https://www.npmjs.com/package/mpp-xpr)
[![license](https://img.shields.io/npm/l/mpp-xpr)](LICENSE)

## Installation

```bash
npm install mpp-xpr mppx
```

## Quick Start

### Server — accept XPR payments

```typescript
import express from 'express'
import { Credential, Receipt } from 'mppx'
import { createServer } from 'mpp-xpr'

const app = express()
const xpr = createServer({ recipient: 'youraccount' })

app.get('/api/premium', async (req, res) => {
  const auth = req.headers['authorization']

  // No credential — return 402 payment challenge
  if (!auth) {
    res.status(402).json({
      method: 'xpr',
      intent: 'charge',
      request: { amount: '0.0001 XPR', recipient: 'youraccount', memo: 'access' },
    })
    return
  }

  // Verify the payment on-chain
  const credential = Credential.deserialize(auth)
  const receipt = await xpr.verify({ credential, request: { amount: '0.0001 XPR', recipient: 'youraccount' } })

  res.setHeader('Payment-Receipt', Receipt.serialize(receipt))
  res.json({ data: 'premium content' })
})
```

### Client — pay automatically on 402

```typescript
import { Mppx } from 'mppx'
import { createClient } from 'mpp-xpr'

const xprClient = createClient({
  // Wire to your wallet (WebAuth, @proton/js, etc.)
  async signTransaction(actions) {
    const result = await session.transact({ actions })
    return { transactionId: result.transaction_id }
  },
})

const { fetch: payFetch } = Mppx.create({ methods: [xprClient] })

// Automatically pays XPR when a 402 is received
const response = await payFetch('https://api.example.com/premium')
```

See [`examples/`](examples/) for a complete working demo.

## API Reference

### `createServer(options)`

Creates a server-side payment verifier. Returns a `Method.Server` compatible with `mppx`.

| Option | Type | Default | Description |
|---|---|---|---|
| `recipient` | `string` | required | Expected XPR account to receive payment |
| `rpcEndpoint` | `string` | `https://api.protonnz.com` | XPR Network RPC endpoint |
| `verifyAmount` | `boolean` | `true` | Check that the transferred amount matches the request |

Internally verifies via the node RPC first, then falls back to Hyperion (`proton.eosusa.io`) for recently submitted transactions.

**Throws** on verification failure (failed receipts are handled by mppx as 402 responses).

---

### `createClient(options)`

Creates a client-side payment method. Returns a `Method.Client` compatible with `Mppx.create()`.

| Option | Type | Description |
|---|---|---|
| `signTransaction` | `(actions) => Promise<{ transactionId, blockNum? }>` | Wallet integration — signs and broadcasts the `eosio.token::transfer` action |

---

### `charge` (method definition)

The raw method schema — useful if you want to build your own client or server logic.

```typescript
import { charge } from 'mpp-xpr'
// charge.name    = 'xpr'
// charge.intent  = 'charge'
// charge.schema  = { request: ZodSchema, credential: { payload: ZodSchema } }
```

## How It Works

```
Client                              Server
  │                                   │
  │── GET /api/premium ──────────────>│
  │                                   │← No credential
  │<── 402 { method:'xpr', amount }───│
  │                                   │
  │── signs eosio.token::transfer ────│ (WebAuth / @proton/js)
  │── submits tx to XPR Network ──────│
  │                                   │
  │── GET /api/premium                │
  │   Authorization: Payment <cred> ─>│
  │                                   │← verifies tx on-chain
  │<── 200 + Payment-Receipt ─────────│
```

## Why XPR Network?

| Feature | Value |
|---|---|
| Gas fees | Zero |
| Finality | < 0.5 seconds |
| Wallet | WebAuth — biometrics, no seed phrases |
| Accounts | Human-readable (e.g. `charliebot`) |
| Token | `XPR` — 4 decimal places (`1.0000 XPR`) |
| Verification | On-chain RPC + Hyperion fallback |

## Chain Info

| | |
|---|---|
| Mainnet RPC | `https://api.protonnz.com` |
| Chain ID | `384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0` |
| Token contract | `eosio.token` |
| Hyperion | `https://proton.eosusa.io` |
| Explorer | `https://explorer.xprnetwork.org` |
| Wallet | [webauth.com](https://webauth.com) |

## Resources

- [Machine Payments Protocol](https://mpp.dev)
- [mppx SDK](https://github.com/wevm/mppx)
- [XPR Network Docs](https://docs.xprnetwork.org)
- [WebAuth Wallet](https://webauth.com)
- [XPR Network Explorer](https://explorer.xprnetwork.org)

## License

MIT
