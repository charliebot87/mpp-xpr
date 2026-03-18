import { z } from 'mppx';
import { Method } from 'mppx';
/**
 * XPR Network charge intent — one-time XPR token transfer.
 *
 * Flow:
 * 1. Server returns 402 with payment request (amount, recipient)
 * 2. Client signs eosio.token::transfer via WebAuth
 * 3. Client returns tx hash as credential
 * 4. Server verifies tx on-chain
 * 5. Server returns receipt
 */
export const charge = Method.from({
    name: 'xpr',
    intent: 'charge',
    schema: {
        request: z.object({
            amount: z.string(), // "10.0000 XPR"
            recipient: z.string(), // XPR account name
            memo: z.optional(z.string()),
            chainId: z.optional(z.string()),
        }),
        credential: {
            payload: z.object({
                txHash: z.string(), // Transaction ID from chain
                blockNum: z.optional(z.number()),
            }),
        },
    },
});
