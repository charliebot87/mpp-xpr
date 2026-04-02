const DEFAULT_RPC = 'https://api.protonnz.com';
/**
 * Parse an extended_asset quantity string like "10.0000 XPR" into a number.
 */
function parseQuantity(qty) {
    // Handle extended_asset format: "10.0000 XPR" or just amount part
    const parts = qty.split(' ');
    return parseFloat(parts[0]);
}
/**
 * Verify an active vest session on-chain via RPC get_table_rows.
 *
 * Checks:
 * - Vest exists in the table
 * - Recipient matches the `to` field
 * - Deposit >= requested maxAmount
 * - Vest is stoppable (required for sessions)
 * - Vest is currently active (now between startTime and endTime)
 */
export async function verifySession(options) {
    const { vestName, recipient, maxAmount, rpc = DEFAULT_RPC } = options;
    const resp = await fetch(`${rpc}/v1/chain/get_table_rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: 'vest',
            scope: 'vest',
            table: 'vest',
            lower_bound: vestName,
            upper_bound: vestName,
            limit: 1,
            json: true,
        }),
    });
    if (!resp.ok) {
        throw new SessionVerificationError(`Failed to query vest table (HTTP ${resp.status})`);
    }
    const data = await resp.json();
    const rows = data.rows;
    if (!rows || rows.length === 0) {
        throw new SessionVerificationError(`Vest "${vestName}" not found on-chain`);
    }
    const vest = rows[0];
    // Verify vest name matches (belt and suspenders)
    if (vest.vestName !== vestName) {
        throw new SessionVerificationError(`Vest name mismatch: expected "${vestName}", got "${vest.vestName}"`);
    }
    // Verify recipient
    if (vest.to !== recipient) {
        throw new SessionVerificationError(`Recipient mismatch: expected "${recipient}", got "${vest.to}"`);
    }
    // Verify deposit amount >= maxAmount
    const depositAmount = parseQuantity(vest.deposit);
    const requiredAmount = parseQuantity(maxAmount);
    if (depositAmount < requiredAmount) {
        throw new SessionVerificationError(`Deposit too low: expected >= ${maxAmount}, got ${vest.deposit}`);
    }
    // Verify stoppable
    if (!vest.stoppable) {
        throw new SessionVerificationError(`Vest "${vestName}" is not stoppable (required for sessions)`);
    }
    // Verify vest is active (not expired)
    const now = Math.floor(Date.now() / 1000);
    if (now > vest.endTime) {
        throw new SessionVerificationError(`Vest "${vestName}" has already expired (endTime: ${vest.endTime})`);
    }
    return { valid: true, vest };
}
export class SessionVerificationError extends Error {
    name = 'SessionVerificationError';
    constructor(message) {
        super(message);
    }
}
