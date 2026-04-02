import { Method, Receipt, Store } from 'mppx';
import { charge as chargeMethod } from './methods.js';
import { verifyTransfer } from './verify.js';
import { sessionServer } from './session.js';
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
function chargeServer(parameters) {
    const { recipient, hyperion = 'https://proton.eosusa.io', amount, memo, } = parameters;
    // In-memory store for used transaction hashes (replay protection)
    const usedTxStore = Store.memory();
    return Method.toServer(chargeMethod, {
        defaults: {
            amount,
            recipient,
            memo,
        },
        async verify({ credential, request }) {
            const { txHash } = credential.payload;
            const expectedRecipient = request.recipient ?? recipient;
            const expectedAmount = request.amount;
            // Check for replay (idempotency) — if we already verified this tx, return cached receipt
            const storeKey = `mppx:xpr:charge:${txHash.toLowerCase()}`;
            const seen = await usedTxStore.get(storeKey);
            if (seen !== null) {
                // Already verified — return cached receipt (idempotent)
                const cached = typeof seen === 'object' && seen !== null ? seen : null;
                return Receipt.from({
                    method: 'xpr',
                    status: 'success',
                    reference: txHash,
                    timestamp: cached?.timestamp || new Date().toISOString(),
                });
            }
            // Verify on-chain via Hyperion with retries.
            // Hyperion indexing can lag 2-10s behind block production,
            // so we retry with exponential backoff before failing.
            const MAX_RETRIES = 4;
            const INITIAL_DELAY_MS = 1500;
            let lastError = null;
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) {
                    const delay = INITIAL_DELAY_MS * Math.pow(1.5, attempt - 1);
                    await new Promise((r) => setTimeout(r, delay));
                }
                try {
                    const result = await verifyTransfer({
                        txHash,
                        recipient: expectedRecipient,
                        amount: expectedAmount,
                        memo: request.memo,
                        hyperion,
                    });
                    // Mark as used with timestamp for idempotent replay
                    await usedTxStore.put(storeKey, { timestamp: result.timestamp || new Date().toISOString() });
                    return Receipt.from({
                        method: 'xpr',
                        status: 'success',
                        reference: txHash,
                        timestamp: result.timestamp || new Date().toISOString(),
                    });
                }
                catch (e) {
                    lastError = e;
                    // Retry on transient errors (not found, rate limited, server errors).
                    // Only throw immediately on definitive validation failures
                    // (amount mismatch, memo mismatch, wrong recipient, etc.)
                    const msg = e.message || '';
                    const isTransient = msg.includes('not found') ||
                        msg.includes('HTTP 404') ||
                        msg.includes('HTTP 429') ||
                        msg.includes('HTTP 502') ||
                        msg.includes('HTTP 503') ||
                        msg.includes('HTTP 504') ||
                        msg.includes('did not execute') ||
                        msg.includes('fetch failed');
                    if (!isTransient) {
                        throw e;
                    }
                }
            }
            throw lastError;
        },
    });
}
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
export const xpr = {
    /** Creates an XPR Network charge method for one-time token transfers. */
    charge: chargeServer,
    /** Creates an XPR Network session method for streaming payments via vest contract. */
    session: sessionServer,
};
export { chargeServer as charge };
