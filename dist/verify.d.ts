export interface VerifyOptions {
    txHash: string;
    recipient: string;
    amount: string;
    memo?: string;
    hyperion?: string;
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
 * Checks: tx executed, correct recipient, correct amount, correct memo, irreversibility.
 */
export declare function verifyTransfer(options: VerifyOptions): Promise<VerifyResult>;
export declare class VerificationError extends Error {
    name: string;
    constructor(message: string);
}
