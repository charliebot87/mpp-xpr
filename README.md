# mpp-xpr

XPR Network payment method for the [Machine Payments Protocol (MPP)](https://mpp.dev).

Zero gas fees. Sub-second finality. Human-readable accounts. WebAuth wallet support.

[![npm](https://img.shields.io/npm/v/mpp-xpr)](https://www.npmjs.com/package/mpp-xpr)
[![license](https://img.shields.io/npm/l/mpp-xpr)](LICENSE)

## What is this?

An [`mppx`](https://github.com/wevm/mppx) plugin that adds XPR Network as a crypto payment method for the Machine Payments Protocol. Works alongside `tempo.charge` and `stripe.charge` — any MPP-compatible client can pay with XPR tokens.

## Installation

```bash
npm install mpp-xpr mppx
```

## Quick Start

### Server — accept XPR payments

```typescript
import crypto from 'crypto'
import { Mppx } from 'mppx/server'
import { createServer, charge } from 'mpp-xpr'

const xpr = createServer({ recipient: 'youraccount' })
const mppSecretKey = crypto.randomBytes(32).toString('base64')

export async function handler(request: Request) {
  const mppx = Mppx.create({
    methods: [xpr],
    secretKey: mppSecretKey,
  })

  const result = await mppx.charge({
    amount: '0.0001',
    recipient: 'youraccount',
  })(request)

  if (result.status === 402) return result.challenge

  return result.withReceipt(Response.json({ data: 'premium content' }))
}
```

### Client — pay automatically on 402

```typescript
import { Mppx } from 'mppx/client'
import { createClient } from 'mpp-xpr'

const xprClient = createClient({
  // Wire to your wallet (WebAuth, @proton/js, etc.)
  async signTransaction(actions) {
    const result = await session.transact({ actions })
    return { transactionId: result.transaction_id }
  },
})

const mppx = Mppx.create({ methods: [xprClient] })

// Automatically pays XPR when a 402 is received
const response = await mppx.fetch('https://api.example.com/premium')
```

See [`examples/`](examples/) for a complete working demo.

## API Reference

### `createServer(options)`

Creates a server-side payment verifier. Returns a `Method.Server` compatible with `mppx/server`.

| Option | Type | Default | Description |
|---|---|---|---|
| `recipient` | `string` | required | Expected XPR account to receive payment |
| `rpcEndpoint` | `string` | `https://api.protonnz.com` | XPR Network RPC endpoint |
| `verifyAmount` | `boolean` | `true` | Check that the transferred amount matches the request |

Verifies via the node RPC first, then falls back to [Hyperion](https://proton.eosusa.io) for recently submitted transactions.

### `createClient(options)`

Creates a client-side payment method. Returns a `Method.Client` compatible with `mppx/client`.

| Option | Type | Description |
|---|---|---|
| `signTransaction` | `(actions) => Promise<{ transactionId, blockNum? }>` | Wallet integration — signs and broadcasts `eosio.token::transfer` |

### `charge` (method definition)

The raw method schema — useful for building custom client/server logic.

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
  │<── 402 + WWW-Authenticate ────────│
  │                                   │
  │── signs eosio.token::transfer ────│ (WebAuth / @proton/js)
  │── submits tx to XPR Network ──────│
  │                                   │
  │── GET /api/premium                │
  │   Authorization: Payment <cred> ─>│
  │                                   │← verifies tx on-chain
  │<── 200 + Payment-Receipt ─────────│
```

## Why XPR Network for Machine Payments?

| Feature | XPR Network | Ethereum | Solana |
|---|---|---|---|
| Gas fees | **Zero** | $0.50-50+ | $0.001-0.01 |
| Finality | **< 0.5 seconds** | ~12 seconds | ~400ms |
| Account format | **Human-readable** (`charliebot`) | Hex (`0x7a3b...`) | Base58 (`7nYB...`) |
| Wallet | **WebAuth** (biometrics) | MetaMask | Phantom |
| Identity | **Built-in KYC** | None | None |

For micropayments, zero gas fees mean 100% of the payment goes to the service — no transaction cost eating into a $0.001 API call.

## Chain Info

| | |
|---|---|
| Mainnet RPC | `https://api.protonnz.com` |
| Chain ID | `384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0` |
| Token contract | `eosio.token` |
| Token symbol | `XPR` (4 decimal places) |
| Hyperion | `https://proton.eosusa.io` |
| Explorer | `https://explorer.xprnetwork.org` |
| Wallet | [webauth.com](https://webauth.com) |

## Resources

- [Machine Payments Protocol](https://mpp.dev) — the open protocol spec
- [MPP Overview](https://mpp.dev/overview) — how MPP works
- [Stripe MPP Docs](https://docs.stripe.com/payments/machine/mpp) — Stripe's MPP integration guide
- [IETF Spec](https://paymentauth.org) — the IETF payment authorization spec
- [mppx SDK](https://github.com/wevm/mppx) — official MPP SDK by Tempo/Wevm
- [XPR Network Docs](https://docs.xprnetwork.org)
- [WebAuth Wallet](https://webauth.com)
- [XPR Network Explorer](https://explorer.xprnetwork.org)

## License

MIT
