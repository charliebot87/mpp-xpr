# mpp-xpr

XPR Network payment method for the [Machine Payments Protocol (MPP)](https://mpp.dev).

Zero gas fees. Sub-second finality. WebAuth wallet support.

## Install

```bash
npm install mpp-xpr
```

## Server (accept XPR payments)

```typescript
import { createServer } from 'mpp-xpr'
import { Mppx } from 'mppx'

const xprServer = createServer({
  recipient: 'youraccount',
  rpcEndpoint: 'https://api.protonnz.com',
})

const mpp = Mppx.create({
  methods: [xprServer],
})

// Protect an endpoint
app.get('/api/premium', mpp.protect({ amount: '1.0000 XPR', recipient: 'youraccount' }), (req, res) => {
  res.json({ data: 'premium content' })
})
```

## Client (pay with XPR)

```typescript
import { createClient } from 'mpp-xpr'
import { Mppx } from 'mppx'

const xprClient = createClient({
  signTransaction: async (actions) => {
    // Use WebAuth SDK or @proton/js to sign
    const result = await session.transact({ actions })
    return { transactionId: result.transaction_id }
  },
})

const { fetch } = Mppx.create({
  methods: [xprClient],
})

// Automatic payment on 402
const response = await fetch('https://api.example.com/premium')
```

## Why XPR?

- **Zero gas fees** — micropayments that actually work
- **Sub-second finality** — payment confirms in <0.5s
- **WebAuth wallet** — sign with biometrics, no seed phrases
- **Human-readable accounts** — pay `@username` not `0x7a3b...`
- **On-chain verification** — server verifies tx directly via RPC

## How it works

1. Client requests protected resource
2. Server returns HTTP 402 with XPR payment challenge
3. Client signs `eosio.token::transfer` via WebAuth
4. Client sends tx hash as credential
5. Server verifies tx on-chain (RPC + Hyperion fallback)
6. Server returns receipt + protected content

## Chain Info

| | Value |
|---|---|
| Mainnet RPC | `https://api.protonnz.com` |
| Chain ID | `384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0` |
| Token | `eosio.token` / `XPR` (4 decimals) |
| Hyperion | `https://proton.eosusa.io` |
| Explorer | `https://explorer.xprnetwork.org` |
