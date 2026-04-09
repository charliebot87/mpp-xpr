import { Method, z } from 'mppx'

/**
 * XPR Network charge intent — one-time XPR token transfer.
 *
 * Flow:
 * 1. Server returns 402 with WWW-Authenticate: Payment challenge
 * 2. Client signs eosio.token::transfer via WebAuth
 * 3. Client retries with Authorization: Payment <credential> containing tx hash
 * 4. Server verifies tx on-chain via Hyperion
 * 5. Server returns content + Payment-Receipt header
 *
 * @see https://paymentauth.org
 */
export const charge = Method.from({
  name: 'xpr',
  intent: 'charge',
  schema: {
    request: z.object({
      /** Amount in XPR (e.g., "1.0000 XPR" or "10000" in base units) */
      amount: z.string(),
      /**
       * XPR-specific method details (non-standard fields per MPP first-party SDK spec).
       * These are embedded in the 402 challenge by the server and read by the client.
       */
      methodDetails: z.optional(z.object({
        /** XPR account name to receive payment */
        recipient: z.optional(z.string()),
        /** Optional memo (defaults to challenge ID) */
        memo: z.optional(z.string()),
      })),
    }),
    credential: {
      payload: z.object({
        /** Transaction ID from the on-chain transfer */
        txHash: z.string(),
      }),
    },
  },
})
