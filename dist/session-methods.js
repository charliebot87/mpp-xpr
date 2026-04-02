import { Method, z } from 'mppx';
/**
 * XPR Network session intent — streaming payment via vest contract.
 *
 * Flow:
 * 1. Server returns 402 with session payment details (vestName, maxAmount, duration)
 * 2. Client deposits XPR to vest contract + calls startvest
 * 3. Client retries with Authorization: Payment credential containing vestName
 * 4. Server verifies vest exists on-chain (correct params, stoppable, active)
 * 5. Server streams content — can call claimvest periodically
 * 6. When done, server or client calls stopvest to settle
 *
 * @see https://paymentauth.org
 */
export const session = Method.from({
    name: 'xpr',
    intent: 'session',
    schema: {
        request: z.object({
            /** Maximum deposit amount (e.g., "10.0000 XPR") */
            maxAmount: z.string(),
            /** Session duration in seconds */
            duration: z.number(),
            /** XPR account name to receive payment */
            recipient: z.string(),
            /** Unique vest name (EOSIO name: 12 chars max, a-z, 1-5, dots) */
            vestName: z.string(),
        }),
        credential: {
            payload: z.object({
                /** The vest name used for on-chain verification */
                vestName: z.string(),
            }),
        },
    },
});
