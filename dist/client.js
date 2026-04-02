import { Credential, Method } from 'mppx';
import { charge } from './methods.js';
/**
 * Client-side XPR payment method for mppx.
 *
 * Usage:
 * ```ts
 * import { Mppx } from 'mppx/client'
 * import { xprClient } from 'mppx-xpr-network'
 *
 * const client = Mppx.create({
 *   methods: [xprClient({ signTransaction: ... })],
 * })
 * ```
 */
export function xprClient(options) {
    return Method.toClient(charge, {
        async createCredential({ challenge }) {
            const { amount, recipient, memo } = challenge.request;
            // Build eosio.token::transfer action
            const actions = [
                {
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{ actor: '', permission: 'active' }],
                    data: {
                        from: '',
                        to: recipient,
                        quantity: amount,
                        memo: memo ?? challenge.id,
                    },
                },
            ];
            const result = await options.signTransaction(actions);
            const credential = Credential.from({
                challenge,
                payload: {
                    txHash: result.transactionId,
                },
            });
            return Credential.serialize(credential);
        },
    });
}
