import { Method } from 'mppx';
export interface XprClientOptions {
    /**
     * Sign and broadcast a transaction via WebAuth or any EOSIO wallet.
     * Should return the transaction ID after broadcast.
     */
    signTransaction: (actions: any[]) => Promise<{
        transactionId: string;
    }>;
}
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
export declare function xprClient(options: XprClientOptions): Method.Client<{
    readonly name: "xpr";
    readonly intent: "charge";
    readonly schema: {
        readonly request: import("zod/mini").ZodMiniObject<{
            amount: import("zod/mini").ZodMiniString<string>;
            recipient: import("zod/mini").ZodMiniString<string>;
            memo: import("zod/mini").ZodMiniOptional<import("zod/mini").ZodMiniString<string>>;
        }, import("zod/v4/core").$strip>;
        readonly credential: {
            readonly payload: import("zod/mini").ZodMiniObject<{
                txHash: import("zod/mini").ZodMiniString<string>;
            }, import("zod/v4/core").$strip>;
        };
    };
}, undefined>;
