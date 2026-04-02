export interface VestRow {
    id: number;
    vestName: string;
    from: string;
    to: string;
    deposit: string | {
        quantity: string;
        contract: string;
    };
    vestPerSecond: string;
    remainingVest?: string;
    startTime: number;
    endTime: number;
    lastClaimTime?: number;
    lastVestTime?: number;
    stoppable: number | boolean;
}
export interface VerifySessionOptions {
    vestName: string;
    recipient: string;
    maxAmount: string;
    rpc?: string;
}
export interface VerifySessionResult {
    valid: boolean;
    vest: VestRow;
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
export declare function verifySession(options: VerifySessionOptions): Promise<VerifySessionResult>;
export declare class SessionVerificationError extends Error {
    name: string;
    constructor(message: string);
}
