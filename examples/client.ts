/**
 * mpp-xpr — Example: Client that automatically pays on 402.
 *
 * This shows how to wire up the XPR client with @proton/js so that
 * any fetch() to an mppx-protected server auto-pays on 402.
 *
 * Run:
 *   npx ts-node --esm examples/client.ts
 *
 * Prerequisites:
 *   - An XPR Network account (get one free at webauth.com)
 *   - Private key for that account
 */
import { Mppx } from 'mppx'
import { createClient } from 'mpp-xpr'
// @ts-ignore — types may not be installed in dev
import { JsonRpc, JsSignatureProvider, Api } from '@proton/js'

// ------------------------------------------------------------------
// 1. Wire up the XPR signer (replace with your key/account)
// ------------------------------------------------------------------
const PRIVATE_KEY = process.env.XPR_PRIVATE_KEY ?? 'YOUR_PRIVATE_KEY_HERE'
const FROM_ACCOUNT = process.env.XPR_ACCOUNT ?? 'youraccount'
const RPC_ENDPOINT = 'https://api.protonnz.com'

const rpc = new JsonRpc(RPC_ENDPOINT)
const signatureProvider = new JsSignatureProvider([PRIVATE_KEY])
const api = new Api({ rpc, signatureProvider })

// ------------------------------------------------------------------
// 2. Create the mpp-xpr client method
// ------------------------------------------------------------------
const xprClient = createClient({
  /**
   * signTransaction receives the EOSIO actions to sign and broadcast.
   * The wallet fills in `from` and the active authorization automatically.
   */
  async signTransaction(actions) {
    // Patch the `from` field with our account name
    const patched = actions.map((a) => ({
      ...a,
      authorization: [{ actor: FROM_ACCOUNT, permission: 'active' }],
      data: { ...a.data, from: FROM_ACCOUNT },
    }))

    const result = await api.transact(
      { actions: patched },
      { blocksBehind: 3, expireSeconds: 30 },
    )

    return {
      transactionId: (result as any).transaction_id,
      blockNum: (result as any).processed?.block_num,
    }
  },
})

// ------------------------------------------------------------------
// 3. Create a payment-aware fetch client
// ------------------------------------------------------------------
const { fetch: payFetch } = Mppx.create({
  methods: [xprClient],
})

// ------------------------------------------------------------------
// 4. Call a 402-protected endpoint — payment happens automatically
// ------------------------------------------------------------------
async function main() {
  const SERVER = process.env.MPP_SERVER ?? 'http://localhost:3000'

  console.log('→ Fetching free endpoint...')
  const freeResp = await payFetch(`${SERVER}/api/free`)
  console.log('Free:', await freeResp.json())

  console.log('\n→ Fetching premium endpoint (will pay automatically)...')
  const premiumResp = await payFetch(`${SERVER}/api/premium`)

  if (premiumResp.ok) {
    const receipt = premiumResp.headers.get('Payment-Receipt')
    console.log('Premium:', await premiumResp.json())
    console.log('Receipt header:', receipt)
  } else {
    console.error('Failed:', premiumResp.status, await premiumResp.text())
  }
}

main().catch(console.error)
