import { Method, Receipt, Store } from 'mppx'
import { charge as chargeMethod } from './methods.js'
import { verifyTransfer } from './verify.js'
import { sessionServer } from './session.js'
import type { XprChargeParameters } from './types.js'

/**
 * Creates a server-side XPR Network charge method for mppx.
 *
 * Usage with Mppx.create():
 * ```ts
 * import { Mppx } from 'mppx/server'
 * import { xpr } from 'mppx-xpr-network'
 *
 * const mppx = Mppx.create({
 *   methods: [xpr.charge({ recipient: 'charliebot' })],
 *   secretKey: process.env.MPP_SECRET_KEY,
 * })
 *
 * // In your route handler:
 * const result = await mppx.xpr.charge({ amount: '1.0000 XPR' })(request)
 * if (result.status === 402) return result.challenge
 * return result.withReceipt(Response.json({ data: '...' }))
 * ```
 */
function chargeServer(parameters: XprChargeParameters) {
  const {
    recipient,
    hyperion = 'https://proton.eosusa.io',
    amount,
    memo,
  } = parameters

  // In-memory store for used transaction hashes (replay protection)
  const usedTxStore = Store.memory()

  return Method.toServer(chargeMethod, {
    defaults: {
      amount,
      recipient,
      memo,
    },
    async verify({ credential, request }) {
      const { txHash } = credential.payload
      const expectedRecipient = request.recipient ?? recipient
      const expectedAmount = request.amount

      // Check for replay (idempotency)
      const storeKey = `mppx:xpr:charge:${txHash.toLowerCase()}`
      const seen = await usedTxStore.get(storeKey)
      if (seen !== null) {
        throw new Error('Transaction hash has already been used (replay rejected)')
      }

      // Verify on-chain via Hyperion
      const result = await verifyTransfer({
        txHash,
        recipient: expectedRecipient,
        amount: expectedAmount,
        memo: request.memo,
        hyperion,
      })

      // Mark as used
      await usedTxStore.put(storeKey, Date.now())

      return Receipt.from({
        method: 'xpr',
        status: 'success',
        reference: txHash,
        timestamp: result.timestamp || new Date().toISOString(),
      })
    },
  })
}

/**
 * XPR Network payment method namespace for mppx.
 *
 * ```ts
 * import { xpr } from 'mppx-xpr-network'
 * import { Mppx } from 'mppx/server'
 *
 * const mppx = Mppx.create({
 *   methods: [xpr.charge({ recipient: 'charliebot' })],
 *   secretKey,
 * })
 * ```
 */
export const xpr = {
  /** Creates an XPR Network charge method for one-time token transfers. */
  charge: chargeServer,
  /** Creates an XPR Network session method for streaming payments via vest contract. */
  session: sessionServer,
}

export { chargeServer as charge }
