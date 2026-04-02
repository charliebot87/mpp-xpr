import { Method, Receipt, Store } from 'mppx';
import { session as sessionMethod } from './session-methods.js';
import { verifySession } from './session-verify.js';
/**
 * Generate a unique EOSIO-compatible vest name.
 * EOSIO names: max 12 chars, a-z, 1-5, dots (no dots at start/end).
 */
function generateVestName() {
    const chars = 'abcdefghijklmnopqrstuvwxyz12345';
    // "mpp" prefix + 9 random chars = 12 chars total
    let name = 'mpp';
    for (let i = 0; i < 9; i++) {
        name += chars[Math.floor(Math.random() * chars.length)];
    }
    return name;
}
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
export function sessionServer(config) {
    const { recipient, rpc = 'https://api.protonnz.com', } = config;
    // Track used vest names (replay protection)
    const usedVestStore = Store.memory();
    return Method.toServer(sessionMethod, {
        defaults: {
            recipient,
        },
        // Generate a unique vest name for each challenge.
        // When a credential is present, preserve the vestName from the echoed challenge
        // so the HMAC matches. Only generate a new name for fresh 402 challenges.
        request({ credential, request }) {
            const existingVestName = credential?.challenge?.request?.vestName;
            return {
                ...request,
                recipient: request.recipient ?? recipient,
                vestName: existingVestName || request.vestName || generateVestName(),
            };
        },
        async verify({ credential, request }) {
            const { vestName } = credential.payload;
            const expectedRecipient = request.recipient ?? recipient;
            // Check for replay — if already verified, return cached receipt (idempotent)
            const storeKey = `mppx:xpr:session:${vestName}`;
            const seen = await usedVestStore.get(storeKey);
            if (seen !== null) {
                const cached = typeof seen === 'object' && seen !== null ? seen : null;
                return Receipt.from({
                    method: 'xpr',
                    status: 'success',
                    reference: cached?.reference || vestName,
                    timestamp: cached?.timestamp || new Date().toISOString(),
                });
            }
            // Verify on-chain
            const result = await verifySession({
                vestName,
                recipient: expectedRecipient,
                maxAmount: request.maxAmount,
                rpc,
            });
            // Mark as used with reference for idempotent replay
            const reference = `${vestName}:${result.vest.id}:${result.vest.from}`;
            await usedVestStore.put(storeKey, { reference, timestamp: new Date().toISOString() });
            return Receipt.from({
                method: 'xpr',
                status: 'success',
                reference,
                timestamp: new Date().toISOString(),
            });
        },
    });
}
