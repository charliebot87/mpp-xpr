import { z } from 'mppx';
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
export declare const charge: {
    readonly name: "xpr";
    readonly intent: "charge";
    readonly schema: {
        readonly request: z.ZodMiniObject<{
            /** Amount in XPR (e.g., "1.0000 XPR" or "10000" in base units) */
            amount: z.ZodMiniString<string>;
            /**
             * XPR-specific method details (non-standard fields per MPP first-party SDK spec).
             * These are embedded in the 402 challenge by the server and read by the client.
             */
            methodDetails: z.ZodMiniOptional<z.ZodMiniObject<{
                /** XPR account name to receive payment */
                recipient: z.ZodMiniOptional<z.ZodMiniString<string>>;
                /** Optional memo (defaults to challenge ID) */
                memo: z.ZodMiniOptional<z.ZodMiniString<string>>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
        readonly credential: {
            readonly payload: z.ZodMiniObject<{
                /** Transaction ID from the on-chain transfer */
                txHash: z.ZodMiniString<string>;
            }, z.core.$strip>;
        };
    };
};
