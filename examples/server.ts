/**
 * mpp-xpr — Example: Express server with a 402-protected endpoint.
 *
 * Run:
 *   npx ts-node --esm examples/server.ts
 *
 * Test:
 *   curl http://localhost:3000/api/free
 *   curl http://localhost:3000/api/premium         # → 402 payment challenge
 *   curl http://localhost:3000/api/premium \
 *     -H "Authorization: Payment <credential>"    # → 200 with content
 */
import express from 'express'
import { Credential, Receipt } from 'mppx'
import { createServer } from 'mpp-xpr'

const app = express()
app.use(express.json())

// Create the XPR payment verifier
const xprServer = createServer({
  recipient: 'charliebot',
  rpcEndpoint: 'https://api.protonnz.com',
})

// ------------------------------------------------------------------
// Free endpoint — no payment required
// ------------------------------------------------------------------
app.get('/api/free', (_req, res) => {
  res.json({ message: 'This is free — no XPR needed!' })
})

// ------------------------------------------------------------------
// Premium endpoint — requires a valid XPR payment credential
// ------------------------------------------------------------------
app.get('/api/premium', async (req, res) => {
  const authHeader = req.headers['authorization']

  // 1. No credential → return 402 + payment challenge
  if (!authHeader) {
    res.status(402).json({
      method: 'xpr',
      intent: 'charge',
      request: {
        amount: '0.0001 XPR',
        recipient: 'charliebot',
        memo: 'mpp-premium-access',
      },
    })
    return
  }

  // 2. Credential present → verify the XPR transaction on-chain
  try {
    const credential = Credential.deserialize(authHeader)

    // Verify using the method's built-in verify function
    const receipt: Receipt.Receipt = await xprServer.verify({
      credential: credential as any,
      request: {
        amount: '0.0001 XPR',
        recipient: 'charliebot',
        memo: 'mpp-premium-access',
      },
    })

    res.setHeader('Payment-Receipt', Receipt.serialize(receipt))
    res.json({
      message: 'Premium content unlocked! Thanks for paying with XPR. 🔑',
      txHash: (credential.payload as any).txHash,
      receipt,
    })
  } catch (err: any) {
    res.status(402).json({
      error: 'Payment verification failed',
      detail: err.message,
    })
  }
})

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------
const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`mpp-xpr demo server running at http://localhost:${PORT}`)
  console.log(`  GET /api/free     → free content`)
  console.log(`  GET /api/premium  → 402 → pay with XPR → 200`)
})
