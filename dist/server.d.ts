import { Method } from 'mppx';
interface XprServerOptions {
    rpcEndpoint?: string;
    recipient: string;
    verifyAmount?: boolean;
}
/**
 * Server-side XPR payment verification.
 * Checks the transaction on-chain to confirm payment.
 */
export declare function createServer(options: XprServerOptions): Method.Server<{
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
}, {}, undefined>;
export {};
