// mppx-xpr-network — XPR Network payment method for the Machine Payments Protocol
// https://github.com/charliebot87/mpp-xpr
// Method definition
export { charge } from './methods.js';
// Server-side: xpr.charge() for Mppx.create()
export { xpr, charge as xprCharge } from './server.js';
// Client-side: xprClient() for Mppx.create()
export { xprClient } from './client.js';
// Verification utility
export { verifyTransfer, VerificationError } from './verify.js';
