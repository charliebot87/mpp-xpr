import { Method, Receipt } from 'mppx'
import { JsonRpc } from '@proton/js'
import { charge } from './methods.js'

interface XprServerOptions {
  rpcEndpoint?: string
  recipient: string       // Expected recipient account
  verifyAmount?: boolean  // Verify exact amount matches (default: true)
}

/**
 * Server-side XPR payment verification.
 * Checks the transaction on-chain to confirm payment.
 */
export function createServer(options: XprServerOptions) {
  const rpc = new JsonRpc(options.rpcEndpoint ?? 'https://api.protonnz.com')
  const shouldVerifyAmount = options.verifyAmount !== false

  return Method.toServer(charge, {
    async verify({ credential, request }) {
      const { txHash } = credential.payload
      const { amount, recipient } = request
      const expectedRecipient = recipient ?? options.recipient

      // --- Try node RPC first ---
      try {
        const tx = await rpc.history_get_transaction(txHash)

        if (tx?.trx?.trx) {
          const actions: any[] = tx.trx.trx.actions ?? []
          const transfer = actions.find(
            (a: any) =>
              a.account === 'eosio.token' &&
              a.name === 'transfer' &&
              a.data.to === expectedRecipient,
          )

          if (transfer) {
            if (shouldVerifyAmount && transfer.data.quantity !== amount) {
              throw new Error(`Amount mismatch: expected ${amount}, got ${transfer.data.quantity}`)
            }
            return Receipt.from({
              method: 'xpr',
              status: 'success',
              reference: txHash,
              timestamp: new Date().toISOString(),
            })
          }
        }
      } catch (err: any) {
        // Fall through to Hyperion
        if (err.message?.startsWith('Amount mismatch')) throw err
      }

      // --- Hyperion fallback ---
      const hyperionUrl = `https://proton.eosusa.io/v2/history/get_transaction?id=${txHash}`
      const resp = await fetch(hyperionUrl)
      if (!resp.ok) {
        throw new Error(`Transaction ${txHash} not found or not yet confirmed`)
      }
      const data = await resp.json()

      if (!data.executed) {
        throw new Error(`Transaction ${txHash} did not execute successfully`)
      }

      const transferAction = (data.actions ?? []).find(
        (a: any) =>
          a.act.name === 'transfer' && a.act.data.to === expectedRecipient,
      )

      if (!transferAction) {
        throw new Error(`No transfer to ${expectedRecipient} found in transaction ${txHash}`)
      }

      if (shouldVerifyAmount && transferAction.act.data.quantity !== amount) {
        throw new Error(
          `Amount mismatch: expected ${amount}, got ${transferAction.act.data.quantity}`,
        )
      }

      return Receipt.from({
        method: 'xpr',
        status: 'success',
        reference: txHash,
        timestamp: new Date().toISOString(),
      })
    },
  })
}
