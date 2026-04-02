import { Method, Receipt, Store } from 'mppx'
import { session as sessionMethod } from './session-methods.js'
import { verifySession } from './session-verify.js'
import type { XprSessionConfig } from './types.js'

/**
 * Generate a unique EOSIO-compatible vest name.
 * EOSIO names: max 12 chars, a-z, 1-5, dots (no dots at start/end).
 */
function generateVestName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz12345'
  // "mpp" prefix + 9 random chars = 12 chars total
  let name = 'mpp'
  for (let i = 0; i < 9; i++) {
    name += chars[Math.floor(Math.random() * chars.length)]
  }
  return name
}

/**
 * Creates a server-side XPR Network session method for mppx.
 *
 * Sessions use the vest contract for streaming payments:
 * - Client deposits XPR to vest contract with a time-locked stream
 * - Server verifies the vest on-chain and streams content
 * - Either party can claim accrued tokens or stop the session
 *
 * Usage with Mppx.create():
 * ```ts
 * import { Mppx } from 'mppx/server'
 * import { xpr } from 'mppx-xpr-network'
 *
 * const mppx = Mppx.create({
 *   methods: [
 *     xpr.session({
 *       recipient: 'myservice',
 *       rpc: 'https://api.protonnz.com',
 *     }),
 *   ],
 *   secretKey: process.env.MPP_SECRET_KEY,
 * })
 *
 * // In your streaming endpoint:
 * const result = await mppx.xpr.session({
 *   maxAmount: '10.0000 XPR',
 *   duration: 300,
 * })(request)
 *
 * if (result.status === 402) return result.challenge
 * return result.withReceipt(streamingResponse)
 * ```
 */
export function sessionServer(config: XprSessionConfig) {
  const {
    recipient,
    rpc = 'https://api.protonnz.com',
  } = config

  // Track used vest names (replay protection)
  const usedVestStore = Store.memory()

  return Method.toServer(sessionMethod, {
    defaults: {
      recipient,
    },

    // Generate a unique vest name for each challenge
    request({ request }) {
      return {
        ...request,
        recipient: request.recipient ?? recipient,
        vestName: request.vestName ?? generateVestName(),
      }
    },

    async verify({ credential, request }) {
      const { vestName } = credential.payload
      const expectedRecipient = request.recipient ?? recipient

      // Check for replay
      const storeKey = `mppx:xpr:session:${vestName}`
      const seen = await usedVestStore.get(storeKey)
      if (seen !== null) {
        throw new Error('Vest name has already been used (replay rejected)')
      }

      // Verify on-chain
      const result = await verifySession({
        vestName,
        recipient: expectedRecipient,
        maxAmount: request.maxAmount,
        rpc,
      })

      // Mark as used
      await usedVestStore.put(storeKey, Date.now())

      return Receipt.from({
        method: 'xpr',
        status: 'success',
        reference: `${vestName}:${result.vest.id}:${result.vest.from}`,
        timestamp: new Date().toISOString(),
      })
    },
  })
}
