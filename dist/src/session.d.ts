import { Method } from 'mppx';
import type { XprSessionConfig } from './types.js';
/**
 * Creates a server-side XPR Network session method for mppx.
 *
 * Sessions use the vest contract for streaming payments:
 * - Client deposits XPR to vest contract with a time-locked stream
 * - Server verifies the vest on-chain and streams content
 * - Either party can claim accrued tokens or stop the session
 *
 * Usage with Mppx.create():
 * ```ts
 * import { Mppx } from 'mppx/server'
 * import { xpr } from 'mppx-xpr-network'
 *
 * const mppx = Mppx.create({
 *   methods: [
 *     xpr.session({
 *       recipient: 'myservice',
 *       rpc: 'https://api.protonnz.com',
 *     }),
 *   ],
 *   secretKey: process.env.MPP_SECRET_KEY,
 * })
 *
 * // In your streaming endpoint:
 * const result = await mppx.xpr.session({
 *   maxAmount: '10.0000 XPR',
 *   duration: 300,
 * })(request)
 *
 * if (result.status === 402) return result.challenge
 * return result.withReceipt(streamingResponse)
 * ```
 */
export declare function sessionServer(config: XprSessionConfig): Method.Server<{
    readonly name: "xpr";
    readonly intent: "session";
    readonly schema: {
        readonly request: import("zod/mini").ZodMiniObject<{
            maxAmount: import("zod/mini").ZodMiniString<string>;
            duration: import("zod/mini").ZodMiniNumber<number>;
            recipient: import("zod/mini").ZodMiniString<string>;
            vestName: import("zod/mini").ZodMiniString<string>;
        }, import("zod/v4/core").$strip>;
        readonly credential: {
            readonly payload: import("zod/mini").ZodMiniObject<{
                vestName: import("zod/mini").ZodMiniString<string>;
            }, import("zod/v4/core").$strip>;
        };
    };
}, {
    readonly recipient: string;
}, undefined>;
