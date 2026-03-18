import { Credential, Method } from 'mppx'
import { charge } from './methods.js'

interface XprClientOptions {
  signTransaction: (actions: any[]) => Promise<{ transactionId: string; blockNum?: number }>
}

/**
 * Client-side XPR payment method.
 * Signs a transfer when a 402 is received.
 */
export function createClient(options: XprClientOptions) {
  return Method.toClient(charge, {
    async createCredential({ challenge }) {
      const { amount, recipient, memo } = challenge.request

      const actions = [
        {
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{ actor: '', permission: 'active' }], // Set by wallet
          data: {
            from: '',      // Set by wallet
            to: recipient,
            quantity: amount,
            memo: memo ?? 'mpp payment',
          },
        },
      ]

      const result = await options.signTransaction(actions)

      const credential = Credential.from({
        challenge,
        payload: {
          txHash: result.transactionId,
          blockNum: result.blockNum,
        },
      })

      return Credential.serialize(credential)
    },
  })
}
