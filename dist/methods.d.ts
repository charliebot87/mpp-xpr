import { z } from 'mppx';
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
export declare const charge: {
    readonly name: "xpr";
    readonly intent: "charge";
    readonly schema: {
        readonly request: z.ZodMiniObject<{
            amount: z.ZodMiniString<string>;
            recipient: z.ZodMiniString<string>;
            memo: z.ZodMiniOptional<z.ZodMiniString<string>>;
            chainId: z.ZodMiniOptional<z.ZodMiniString<string>>;
        }, z.core.$strip>;
        readonly credential: {
            readonly payload: z.ZodMiniObject<{
                txHash: z.ZodMiniString<string>;
                blockNum: z.ZodMiniOptional<z.ZodMiniNumber<number>>;
            }, z.core.$strip>;
        };
    };
};
