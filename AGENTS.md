# mpp-xpr

XPR Network payment method plugin for `mppx` (Machine Payments Protocol SDK).

## Architecture

- `src/methods.ts` — Method schema definition (`xpr` / `charge`)
- `src/client.ts` — Client-side: signs `eosio.token::transfer` via wallet
- `src/server.ts` — Server-side: verifies tx on-chain (RPC + Hyperion fallback)
- `src/index.ts` — Re-exports all public API
- `src/test.ts` — End-to-end mainnet test
- `examples/` — Working client/server examples

## Key specs

- MPP Protocol: https://mpp.dev
- IETF Spec: https://paymentauth.org
- Stripe MPP: https://docs.stripe.com/payments/machine/mpp
- mppx SDK: https://github.com/wevm/mppx (npm: mppx)

## mppx compatibility

Uses `Method.from`, `Method.toClient`, `Method.toServer`, `Credential`, `Receipt` from mppx.
Compatible with `Mppx.create()` from both `mppx/server` and `mppx/client`.
Works alongside `tempo.charge` and `stripe.charge` methods.
