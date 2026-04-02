import type { HyperionTransaction } from './types.js'

const DEFAULT_HYPERION = 'https://proton.eosusa.io'

export interface VerifyOptions {
  txHash: string
  recipient: string
  amount: string
  memo?: string
  hyperion?: string
}

export interface VerifyResult {
  valid: boolean
  from: string
  amount: string
  txHash: string
  blockNum: number
  timestamp: string
}

/**
 * Verify an XPR token transfer on-chain via Hyperion.
 * Checks: tx executed, correct recipient, correct amount, correct memo, irreversibility.
 */
export async function verifyTransfer(options: VerifyOptions): Promise<VerifyResult> {
  const { txHash, recipient, amount, memo } = options
  const hyperion = options.hyperion ?? DEFAULT_HYPERION

  const resp = await fetch(
    `${hyperion}/v2/history/get_transaction?id=${txHash}`
  )

  if (!resp.ok) {
    throw new VerificationError(
      `Transaction ${txHash} not found (HTTP ${resp.status})`
    )
  }

  const data: HyperionTransaction = await resp.json()

  if (!data.executed) {
    throw new VerificationError(
      `Transaction ${txHash} did not execute successfully`
    )
  }

  // Find the matching transfer action
  const transfer = (data.actions ?? []).find(
    (a) =>
      a.act.account === 'eosio.token' &&
      a.act.name === 'transfer' &&
      a.act.data.to === recipient
  )

  if (!transfer) {
    throw new VerificationError(
      `No eosio.token::transfer to ${recipient} found in tx ${txHash}`
    )
  }

  // Verify amount
  const actualAmount = transfer.act.data.quantity
  if (actualAmount !== amount) {
    throw new VerificationError(
      `Amount mismatch: expected "${amount}", got "${actualAmount}"`
    )
  }

  // Verify memo if provided
  if (memo && transfer.act.data.memo !== memo) {
    throw new VerificationError(
      `Memo mismatch: expected "${memo}", got "${transfer.act.data.memo}"`
    )
  }

  return {
    valid: true,
    from: transfer.act.data.from,
    amount: actualAmount,
    txHash,
    blockNum: transfer.block_num,
    timestamp: transfer['@timestamp'],
  }
}

export class VerificationError extends Error {
  override name = 'VerificationError'
  constructor(message: string) {
    super(message)
  }
}
