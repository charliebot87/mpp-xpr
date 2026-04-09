import { Method, Receipt, Store } from 'mppx';
import { charge as chargeMethod } from './methods.js';
import { verifyTransfer } from './verify.js';
import { sessionServer } from './session.js';
/**
 * Normalize a Hyperion timestamp to strict ISO 8601.
 * Hyperion returns '2026-04-02T21:29:57.500' (no timezone).
 * Receipt.from() requires a Z or ±HH:MM suffix.
 */
function normalizeTimestamp(ts) {
    if (!ts)
        return new Date().toISOString();
    // If already has timezone suffix, return as-is
    if (ts.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(ts))
        return ts;
    // Hyperion timestamps are UTC — append Z
    return ts + 'Z';
}
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
    const { recipient, hyperion, hyperionEndpoints, amount, memo, } = parameters;
    // In-memory store for used transaction hashes (replay protection)
    const usedTxStore = Store.memory();
    return Method.toServer(chargeMethod, {
        defaults: {
            amount,
            // Embed recipient and memo in methodDetails per MPP first-party SDK spec
            methodDetails: {
                recipient,
                memo,
            },
        },
        async verify({ credential, request }) {
            const { txHash } = credential.payload;
            const expectedRecipient = request.methodDetails?.recipient ?? recipient;
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
                    timestamp: normalizeTimestamp(cached?.timestamp),
                });
            }
            // Verify on-chain via Hyperion with retries.
            // verifyTransfer already tries multiple Hyperion endpoints,
            // but we still retry for indexing lag (tx not indexed yet on ANY node).
            const MAX_RETRIES = 3;
            const RETRY_DELAYS = [2000, 3000, 5000];
            let lastError = null;
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) {
                    await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
                }
                try {
                    const result = await verifyTransfer({
                        txHash,
                        recipient: expectedRecipient,
                        amount: expectedAmount,
                        memo: request.methodDetails?.memo,
                        hyperion,
                        hyperionEndpoints,
                    });
                    // Mark as used with timestamp for idempotent replay
                    await usedTxStore.put(storeKey, { timestamp: result.timestamp || new Date().toISOString() });
                    return Receipt.from({
                        method: 'xpr',
                        status: 'success',
                        reference: txHash,
                        timestamp: normalizeTimestamp(result.timestamp),
                    });
                }
                catch (e) {
                    lastError = e;
                    // Definitive failures (amount mismatch, wrong recipient) — don't retry
                    const msg = e.message || '';
                    if (msg.includes('mismatch') || (msg.includes('No eosio.token') && !msg.includes('not found'))) {
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
