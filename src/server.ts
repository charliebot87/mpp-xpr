import { Method, Receipt } from 'mppx'
import { JsonRpc } from '@proton/js'
import { charge } from './methods.js'

interface XprServerOptions {
  rpcEndpoint?: string;
  recipient: string;         // Expected recipient account
  verifyAmount?: boolean;    // Verify exact amount matches (default: true)
}

/**
 * Server-side XPR payment verification.
 * Checks the transaction on-chain to confirm payment.
 */
export function createServer(options: XprServerOptions) {
  const rpc = new JsonRpc(options.rpcEndpoint || 'https://api.protonnz.com')
  const verifyAmount = options.verifyAmount !== false

  return Method.toServer(charge, {
    async verifyCredential({ credential, request }) {
      const { txHash } = credential.payload
      const { amount, recipient } = request

      try {
        // Fetch transaction from chain
        const tx = await rpc.history_get_transaction(txHash)

        if (!tx || !tx.trx || !tx.trx.trx) {
          return Receipt.from({
            method: 'xpr',
            success: false,
            status: 'failed',
            timestamp: new Date().toISOString(),
          })
        }

        // Find the transfer action in the transaction
        const actions = tx.trx.trx.actions || []
        const transfer = actions.find((a: any) =>
          a.account === 'eosio.token' &&
          a.name === 'transfer' &&
          a.data.to === (recipient || options.recipient)
        )

        if (!transfer) {
          return Receipt.from({
            method: 'xpr',
            success: false,
            status: 'failed',
            timestamp: new Date().toISOString(),
          })
        }

        // Verify amount if required
        if (verifyAmount && transfer.data.quantity !== amount) {
          return Receipt.from({
            method: 'xpr',
            success: false,
            status: 'failed',
            timestamp: new Date().toISOString(),
          })
        }

        // Payment verified!
        return Receipt.from({
          method: 'xpr',
          success: true,
          status: 'success',
          timestamp: new Date().toISOString(),
        })
      } catch (error: any) {
        // Transaction not found yet — might need to wait for irreversibility
        // Try hyperion as fallback
        try {
          const hyperionUrl = `https://proton.eosusa.io/v2/history/get_transaction?id=${txHash}`
          const resp = await fetch(hyperionUrl)
          const data = await resp.json()

          if (data.executed) {
            const transferAction = data.actions?.find((a: any) =>
              a.act.name === 'transfer' &&
              a.act.data.to === (recipient || options.recipient)
            )

            if (transferAction) {
              if (verifyAmount && transferAction.act.data.quantity !== amount) {
                return Receipt.from({ method: 'xpr', success: false, status: 'failed', timestamp: new Date().toISOString() })
              }
              return Receipt.from({ method: 'xpr', success: true, status: 'success', timestamp: new Date().toISOString() })
            }
          }
        } catch {}

        return Receipt.from({
          method: 'xpr',
          success: false,
          status: 'failed',
          timestamp: new Date().toISOString(),
        })
      }
    },
  })
}
