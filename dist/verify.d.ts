export interface VerifyOptions {
    txHash: string;
    recipient: string;
    amount: string;
    memo?: string;
    /** Primary Hyperion endpoint */
    hyperion?: string;
    /** Additional fallback Hyperion endpoints */
    hyperionEndpoints?: string[];
}
export interface VerifyResult {
    valid: boolean;
    from: string;
    amount: string;
    txHash: string;
    blockNum: number;
    timestamp: string;
}
/**
 * Verify an XPR token transfer on-chain via Hyperion.
 * Tries the primary endpoint first, then falls back to alternates.
 * Checks: tx executed, correct recipient, correct amount, correct memo.
 */
export declare function verifyTransfer(options: VerifyOptions): Promise<VerifyResult>;
export declare class VerificationError extends Error {
    name: string;
    constructor(message: string);
}
