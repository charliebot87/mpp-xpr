/**
 * XPR Network payment method types for mppx.
 */
export interface XprChargeConfig {
    /** XPR account to receive payments (e.g., 'charliebot') */
    recipient: string;
    /** Hyperion API endpoint for tx verification */
    hyperion?: string;
    /** XPR Network RPC endpoint */
    rpc?: string;
    /** Challenge expiry in milliseconds (default: 5 minutes) */
    expiryMs?: number;
}
export interface XprChargeParameters extends XprChargeConfig {
    /** Default amount in XPR (e.g., '1.0000') */
    amount?: string;
    /** Default memo */
    memo?: string;
}
export interface HyperionTransaction {
    executed: boolean;
    trx_id: string;
    lib: number;
    actions: HyperionAction[];
}
export interface HyperionAction {
    act: {
        account: string;
        name: string;
        data: {
            from: string;
            to: string;
            quantity: string;
            memo: string;
        };
    };
    block_num: number;
    '@timestamp': string;
}
