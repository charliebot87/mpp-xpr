# mppx-xpr-network

XPR Network payment method for the [Machine Payments Protocol](https://mpp.dev) (MPP).

Zero gas fees. Sub-second finality. Human-readable accounts. Built for machine-to-machine payments.

## Installation

```bash
npm install mppx-xpr-network mppx
```

## Server Usage

```ts
import { Mppx } from 'mppx/server'
import { xpr } from 'mppx-xpr-network'

const mppx = Mppx.create({
  methods: [
    xpr.charge({ recipient: 'charliebot' }),
  ],
  secretKey: process.env.MPP_SECRET_KEY,
})

// In your route handler (Next.js, Express, etc.)
export async function GET(request: Request) {
  const result = await mppx.xpr.charge({
    amount: '1.0000 XPR',
  })(request)

  if (result.status === 402) return result.challenge

  return result.withReceipt(
    Response.json({ joke: 'Why did the AI cross the blockchain?' })
  )
}
```

The server automatically:
- Returns `402` with `WWW-Authenticate: Payment` challenge header
- Parses `Authorization: Payment` credentials from retry requests
- Verifies the on-chain transfer via [Hyperion](https://proton.eosusa.io)
- Attaches `Payment-Receipt` header to successful responses
- Rejects replay attacks (duplicate transaction hashes)

## Client Usage

```ts
import { Mppx } from 'mppx/client'
import { xprClient } from 'mppx-xpr-network'

const mppx = Mppx.create({
  methods: [
    xprClient({
      signTransaction: async (actions) => {
        // Use WebAuth SDK, @nicknguyen/proton-web-sdk, or any EOSIO wallet
        const result = await session.transact({ actions }, { broadcast: true })
        return { transactionId: result.processed.id }
      },
    }),
  ],
})
```

## Payment Flow

```
Client                          Server                      XPR Network
  |                               |                              |
  |  GET /api/resource            |                              |
  |------------------------------>|                              |
  |                               |                              |
  |  402 + WWW-Authenticate:      |                              |
  |  Payment (challenge)          |                              |
  |<------------------------------|                              |
  |                               |                              |
  |  eosio.token::transfer        |                              |
  |  to=charliebot, memo=uuid     |                              |
  |------------------------------------------------------------->|
  |                               |                              |
  |  GET /api/resource            |                              |
  |  Authorization: Payment       |                              |
  |  (credential with txHash)     |                              |
  |------------------------------>|                              |
  |                               |  verify tx via Hyperion      |
  |                               |----------------------------->|
  |                               |                              |
  |  200 OK + Payment-Receipt     |                              |
  |  (content + receipt header)   |                              |
  |<------------------------------|                              |
```

## Sessions (Streaming Payments)

Sessions use the XPR Network `vest` contract for time-locked streaming payments. The client deposits XPR into a vest stream; the server verifies on-chain and streams content. Either party can stop the session early — remaining funds are refunded.

```ts
import { Mppx } from 'mppx/server'
import { xpr } from 'mppx-xpr-network'

const mppx = Mppx.create({
  methods: [
    xpr.session({
      recipient: 'myservice',
      rpc: 'https://api.protonnz.com',
    }),
  ],
  secretKey: process.env.MPP_SECRET_KEY,
})

// Streaming endpoint
export async function GET(request: Request) {
  const result = await mppx.xpr.session({
    maxAmount: '10.0000 XPR',
    duration: 300, // 5 minutes
  })(request)

  if (result.status === 402) return result.challenge

  // Stream content to the client
  const stream = new ReadableStream({ ... })
  return result.withReceipt(new Response(stream))
}
```

### Session Flow

```
Client                          Server                      XPR Network (vest)
  |                               |                              |
  |  GET /api/stream              |                              |
  |------------------------------>|                              |
  |                               |                              |
  |  402 + WWW-Authenticate:      |                              |
  |  Payment (session challenge)  |                              |
  |  {vestName, maxAmount, dur}   |                              |
  |<------------------------------|                              |
  |                               |                              |
  |  1. transfer XPR to vest      |                              |
  |     memo="deposit"            |                              |
  |  2. startvest(vestName, ...)  |                              |
  |------------------------------------------------------------->|
  |                               |                              |
  |  GET /api/stream              |                              |
  |  Authorization: Payment       |                              |
  |  {vestName}                   |                              |
  |------------------------------>|                              |
  |                               |  verify vest table           |
  |                               |----------------------------->|
  |                               |                              |
  |  200 OK (streaming content)   |                              |
  |  + Payment-Receipt            |                              |
  |<------------------------------|                              |
  |                               |                              |
  |           ... streaming ...   |  claimvest (periodic)        |
  |                               |----------------------------->|
  |                               |                              |
  |  stopvest (session end)       |                              |
  |------------------------------------------------------------->|
  |                               |  final claimvest             |
  |                               |----------------------------->|
```

### Vest Contract Actions

| Action | Who | What |
|--------|-----|------|
| `eosio.token::transfer` to `vest` | Client | Deposit XPR (memo: "deposit") |
| `vest::startvest` | Client | Start streaming session |
| `vest::claimvest` | Server | Withdraw accrued tokens |
| `vest::stopvest` | Either | End session early, refund remainder |

### Sessions vs Charges

| | `xpr.charge()` | `xpr.session()` |
|---|---|---|
| Use case | One-time payment | Streaming / metered |
| On-chain actions | 1 (transfer) | 2+ (deposit + startvest + claims) |
| Refundable | No | Yes (stopvest refunds remainder) |
| Verification | Hyperion tx lookup | Vest table query |
| Gas fees | $0 | $0 |

### XPR Sessions vs Tempo Sessions

| | XPR Network | Tempo (EVM) |
|---|---|---|
| Gas to open session | **$0** | ~$0.001 (EVM tx) |
| Gas to close session | **$0** | ~$0.001 (EVM tx) |
| Gas per claim | **$0** | ~$0.001 per claim |
| Finality | < 500ms | ~1s |
| Accounts | Human-readable | Hex addresses |
| Native streaming | vest contract | Custom contract |

XPR Network's zero gas fees mean sessions cost exactly nothing to open, claim, and close — the only cost is the actual payment amount.

## Configuration

### Charge

```ts
xpr.charge({
  recipient: 'charliebot',        // XPR account to receive payments
  hyperion: 'https://proton.eosusa.io',  // Hyperion API for verification
  rpc: 'https://api.protonnz.com',       // XPR Network RPC
  amount: '1.0000 XPR',                  // Default amount
  memo: 'custom-memo',                   // Default memo
})
```

### Session

```ts
xpr.session({
  recipient: 'myservice',                // XPR account to receive payments
  rpc: 'https://api.protonnz.com',       // RPC for vest table queries
})
```

## Why XPR Network for Machine Payments?

| Feature | XPR Network | Ethereum | Solana | Tempo |
|---------|------------|----------|--------|-------|
| Gas fees | **$0 (zero)** | $0.50-$50+ | $0.001-$0.05 | ~$0.001 |
| Finality | **< 500ms** | ~12 min | ~400ms | ~1s |
| Account names | **Human-readable** (`charliebot`) | Hex (`0x7a58...`) | Base58 (`Gh9Z...`) | Hex |
| Identity/KYC | **Built-in** | None | None | None |
| Wallet auth | **Biometric (WebAuth)** | Seed phrase | Seed phrase | Seed phrase |
| Account creation | **Free** | Free (EOA) | ~$0.002 | Free |
| Smart contracts | Yes (C++) | Yes (Solidity) | Yes (Rust) | Yes (Solidity) |

### XPR Network advantages for agents and machines:
- **Zero gas fees** — the payment amount is exactly what the recipient gets
- **Sub-second finality** — no waiting for block confirmations
- **Human-readable accounts** — pay `charliebot` not `0x7a58c3F2...`
- **Built-in identity** — on-chain KYC verification for compliance
- **WebAuth wallet** — biometric authentication, no seed phrases needed
- **Free account creation** — onboard users at zero cost
- **On-chain agent registry** — trust scores, escrow jobs, A2A protocol

## Spec Compliance

This package implements the [Payment Authentication](https://paymentauth.org) IETF draft:

- `WWW-Authenticate: Payment` — 402 challenge header
- `Authorization: Payment` — credential header with base64-encoded proof
- `Payment-Receipt` — receipt header with base64-encoded settlement proof
- HMAC-bound challenge IDs via mppx `secretKey`
- Replay protection via transaction hash deduplication

## Links

- [MPP Specification](https://mpp.dev)
- [Payment Authentication (IETF)](https://paymentauth.org)
- [XPR Network](https://xprnetwork.org)
- [WebAuth Wallet](https://webauth.com)
- [mppx SDK](https://github.com/wevm/mppx)
- [Playground Demo](https://x402.charliebot.dev)

## License

MIT
