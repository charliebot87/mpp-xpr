import { DEFAULT_HYPERION_ENDPOINTS } from './types.js';
/**
 * Verify an XPR token transfer on-chain via Hyperion.
 * Tries the primary endpoint first, then falls back to alternates.
 * Checks: tx executed, correct recipient, correct amount, correct memo.
 */
export async function verifyTransfer(options) {
    const { txHash, recipient, amount, memo } = options;
    // Build endpoint list: explicit primary first, then fallbacks, then defaults
    const endpoints = buildEndpointList(options.hyperion, options.hyperionEndpoints);
    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            const result = await tryVerify(endpoint, txHash, recipient, amount, memo);
            return result;
        }
        catch (e) {
            lastError = e;
            // If it's a definitive validation failure (amount mismatch, wrong recipient),
            // don't try other endpoints — the tx data is the same everywhere
            if (isDefinitiveFailure(e)) {
                throw e;
            }
            // Otherwise (404, 429, 500, timeout, fetch error) — try next endpoint
            continue;
        }
    }
    throw lastError ?? new VerificationError(`Transaction ${txHash} not found on any Hyperion endpoint`);
}
/**
 * Build a deduplicated list of Hyperion endpoints to try.
 */
function buildEndpointList(primary, additional) {
    const seen = new Set();
    const result = [];
    const add = (url) => {
        const normalized = url.replace(/\/+$/, '');
        if (!seen.has(normalized)) {
            seen.add(normalized);
            result.push(normalized);
        }
    };
    // Primary first
    if (primary)
        add(primary);
    // Explicit additional endpoints
    if (additional) {
        for (const ep of additional)
            add(ep);
    }
    // Default endpoints as final fallbacks
    for (const ep of DEFAULT_HYPERION_ENDPOINTS)
        add(ep);
    return result;
}
/**
 * Try to verify a transaction against a single Hyperion endpoint.
 */
async function tryVerify(hyperion, txHash, recipient, amount, memo) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout per endpoint
    try {
        const resp = await fetch(`${hyperion}/v2/history/get_transaction?id=${txHash}`, { signal: controller.signal });
        if (!resp.ok) {
            const statusMsg = resp.status === 429 ? 'rate limited' :
                resp.status === 404 ? 'not found' :
                    resp.status >= 500 ? 'server error' : 'unavailable';
            throw new VerificationError(`Transaction ${txHash} ${statusMsg} (HTTP ${resp.status} from ${hyperion})`);
        }
        const data = await resp.json();
        if (!data.executed) {
            throw new VerificationError(`Transaction ${txHash} did not execute successfully`);
        }
        // Find the matching transfer action
        const transfer = (data.actions ?? []).find((a) => a.act.account === 'eosio.token' &&
            a.act.name === 'transfer' &&
            a.act.data.to === recipient);
        if (!transfer) {
            throw new VerificationError(`No eosio.token::transfer to ${recipient} found in tx ${txHash}`);
        }
        // Verify amount
        const actualAmount = transfer.act.data.quantity;
        if (actualAmount !== amount) {
            throw new VerificationError(`Amount mismatch: expected "${amount}", got "${actualAmount}"`);
        }
        // Verify memo if provided
        if (memo && transfer.act.data.memo !== memo) {
            throw new VerificationError(`Memo mismatch: expected "${memo}", got "${transfer.act.data.memo}"`);
        }
        return {
            valid: true,
            from: transfer.act.data.from,
            amount: actualAmount,
            txHash,
            blockNum: transfer.block_num,
            timestamp: transfer['@timestamp'],
        };
    }
    finally {
        clearTimeout(timeout);
    }
}
/**
 * Check if an error represents a definitive validation failure
 * (i.e., the tx data was found but doesn't match requirements).
 * These should NOT be retried on other endpoints.
 */
function isDefinitiveFailure(e) {
    const msg = e.message || '';
    return msg.includes('mismatch') ||
        msg.includes('did not execute') ||
        (msg.includes('No eosio.token::transfer') && !msg.includes('not found'));
}
export class VerificationError extends Error {
    name = 'VerificationError';
    constructor(message) {
        super(message);
    }
}
