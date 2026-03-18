import { Method } from 'mppx';
interface XprClientOptions {
    signTransaction: (actions: any[]) => Promise<{
        transactionId: string;
        blockNum?: number;
    }>;
}
/**
 * Client-side XPR payment method.
 * Signs a transfer when a 402 is received.
 */
export declare function createClient(options: XprClientOptions): Method.Client<{
    readonly name: "xpr";
    readonly intent: "charge";
    readonly schema: {
        readonly request: import("zod/mini").ZodMiniObject<{
            amount: import("zod/mini").ZodMiniString<string>;
            recipient: import("zod/mini").ZodMiniString<string>;
            memo: import("zod/mini").ZodMiniOptional<import("zod/mini").ZodMiniString<string>>;
            chainId: import("zod/mini").ZodMiniOptional<import("zod/mini").ZodMiniString<string>>;
        }, import("zod/v4/core").$strip>;
        readonly credential: {
            readonly payload: import("zod/mini").ZodMiniObject<{
                txHash: import("zod/mini").ZodMiniString<string>;
                blockNum: import("zod/mini").ZodMiniOptional<import("zod/mini").ZodMiniNumber<number>>;
            }, import("zod/v4/core").$strip>;
        };
    };
}, undefined>;
export {};
