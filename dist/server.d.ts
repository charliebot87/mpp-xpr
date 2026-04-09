import { Method } from 'mppx';
import { sessionServer } from './session.js';
import type { XprChargeParameters } from './types.js';
/**
 * Creates a server-side XPR Network charge method for mppx.
 *
 * Usage with Mppx.create():
 * ```ts
 * import { Mppx } from 'mppx/server'
 * import { xpr } from 'mppx-xpr-network'
 *
 * const mppx = Mppx.create({
 *   methods: [xpr.charge({ recipient: 'charliebot' })],
 *   secretKey: process.env.MPP_SECRET_KEY,
 * })
 *
 * // In your route handler:
 * const result = await mppx.xpr.charge({ amount: '1.0000 XPR' })(request)
 * if (result.status === 402) return result.challenge
 * return result.withReceipt(Response.json({ data: '...' }))
 * ```
 */
declare function chargeServer(parameters: XprChargeParameters): Method.Server<{
    readonly name: "xpr";
    readonly intent: "charge";
    readonly schema: {
        readonly request: import("zod/mini").ZodMiniObject<{
            amount: import("zod/mini").ZodMiniString<string>;
            methodDetails: import("zod/mini").ZodMiniOptional<import("zod/mini").ZodMiniObject<{
                recipient: import("zod/mini").ZodMiniOptional<import("zod/mini").ZodMiniString<string>>;
                memo: import("zod/mini").ZodMiniOptional<import("zod/mini").ZodMiniString<string>>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip>;
        readonly credential: {
            readonly payload: import("zod/mini").ZodMiniObject<{
                txHash: import("zod/mini").ZodMiniString<string>;
            }, import("zod/v4/core").$strip>;
        };
    };
}, {
    readonly amount: string | undefined;
    readonly methodDetails: {
        readonly recipient: string;
        readonly memo: string | undefined;
    };
}, undefined>;
/**
 * XPR Network payment method namespace for mppx.
 *
 * ```ts
 * import { xpr } from 'mppx-xpr-network'
 * import { Mppx } from 'mppx/server'
 *
 * const mppx = Mppx.create({
 *   methods: [xpr.charge({ recipient: 'charliebot' })],
 *   secretKey,
 * })
 * ```
 */
export declare const xpr: {
    /** Creates an XPR Network charge method for one-time token transfers. */
    charge: typeof chargeServer;
    /** Creates an XPR Network session method for streaming payments via vest contract. */
    session: typeof sessionServer;
};
export { chargeServer as charge };
