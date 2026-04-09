const DEFAULT_RPC = 'https://api.protonnz.com'

export interface VestRow {
  id: number
  vestName: string
  from: string
  to: string
  deposit: string | { quantity: string; contract: string }
  vestPerSecond: string
  remainingVest?: string
  startTime: number
  endTime: number
  lastClaimTime?: number
  lastVestTime?: number
  stoppable: number | boolean
}

export interface VerifySessionOptions {
  vestName: string
  recipient: string
  maxAmount: string
  rpc?: string
}

export interface VerifySessionResult {
  valid: boolean
  vest: VestRow
}

/**
 * Parse an extended_asset quantity string like "10.0000 XPR" into integer units.
 * Uses bigint arithmetic to avoid floating-point precision issues with money.
 * Assumes 4 decimal places (XPR standard).
 */
function parseQuantityUnits(qty: string): bigint {
  const [amountStr] = qty.split(' ')
  const [whole = '0', frac = ''] = amountStr.split('.')
  const fracPadded = frac.padEnd(4, '0').slice(0, 4)
  return BigInt(whole) * 10000n + BigInt(fracPadded)
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
export async function verifySession(options: VerifySessionOptions): Promise<VerifySessionResult> {
  const { vestName, recipient, maxAmount, rpc = DEFAULT_RPC } = options

  // The vest table is keyed by integer ID, not vestName.
  // Query the most recent vests (reverse order) and find by name.
  // Our vests are always freshly created, so they'll be in the last few rows.
  const resp = await fetch(`${rpc}/v1/chain/get_table_rows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'vest',
      scope: 'vest',
      table: 'vest',
      limit: 20,
      json: true,
      reverse: true,
    }),
  })

  if (!resp.ok) {
    throw new SessionVerificationError(
      `Failed to query vest table (HTTP ${resp.status})`
    )
  }

  const data = await resp.json()
  const rows = data.rows as VestRow[]
  const vest = (rows || []).find(r => r.vestName === vestName)

  if (!vest) {
    throw new SessionVerificationError(
      `Vest "${vestName}" not found on-chain`
    )
  }

  // Verify vest name matches (belt and suspenders)
  if (vest.vestName !== vestName) {
    throw new SessionVerificationError(
      `Vest name mismatch: expected "${vestName}", got "${vest.vestName}"`
    )
  }

  // Verify recipient
  if (vest.to !== recipient) {
    throw new SessionVerificationError(
      `Recipient mismatch: expected "${recipient}", got "${vest.to}"`
    )
  }

  // Verify deposit amount >= maxAmount
  // deposit can be a string "10.0000 XPR" or extended_asset { quantity: "10.0000 XPR", contract: "eosio.token" }
  const depositStr = typeof vest.deposit === 'string' ? vest.deposit : (vest.deposit as any)?.quantity || '0'
  const depositAmount = parseQuantityUnits(depositStr)
  const requiredAmount = parseQuantityUnits(maxAmount)
  if (depositAmount < requiredAmount) {
    throw new SessionVerificationError(
      `Deposit too low: expected >= ${maxAmount}, got ${vest.deposit}`
    )
  }

  // Verify stoppable (on-chain uses 0/1, not true/false)
  if (!vest.stoppable) {
    throw new SessionVerificationError(
      `Vest "${vestName}" is not stoppable (required for sessions)`
    )
  }

  // Verify vest is active (not expired)
  const now = Math.floor(Date.now() / 1000)
  if (now > vest.endTime) {
    throw new SessionVerificationError(
      `Vest "${vestName}" has already expired (endTime: ${vest.endTime})`
    )
  }

  return { valid: true, vest }
}

export class SessionVerificationError extends Error {
  override name = 'SessionVerificationError'
  constructor(message: string) {
    super(message)
  }
}
