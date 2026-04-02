// mppx-xpr-network — XPR Network payment method for the Machine Payments Protocol
// https://github.com/charliebot87/mpp-xpr

// Method definitions
export { charge } from './methods.js'
export { session } from './session-methods.js'

// Server-side: xpr.charge() and xpr.session() for Mppx.create()
export { xpr, charge as xprCharge } from './server.js'

// Client-side: xprClient() for Mppx.create()
export { xprClient } from './client.js'

// Verification utilities
export { verifyTransfer, VerificationError } from './verify.js'
export { verifySession, SessionVerificationError } from './session-verify.js'

// Types
export type {
  XprChargeConfig,
  XprChargeParameters,
  XprSessionConfig,
  HyperionTransaction,
  HyperionAction,
} from './types.js'
