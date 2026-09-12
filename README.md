# 🪷 SenChain — Blockchain Marketplace for AI-Generated Game Assets (Mockup)

INTE2581 S2 2026 · Assessment Task 3 — clickable **web mockup** demonstrating how a Vietnamese marketplace for AI-generated game/virtual assets would use blockchain, smart contracts, NFTs and AI provenance to solve the five assignment issues.

> **Everything is simulated** — no real chain, wallet, payment, or AI. State lives in `localStorage`.

## Run

```bash
bun install
bun run dev      # build + serve → http://localhost:5173
```

## What the prototype demonstrates (assignment → screen)

| Assignment requirement | Where |
|---|---|
| B2 user roles | Sign in (top-right): An Trần (creator) · Bình Lê (buyer) · Chị Phạm (reviewer) |
| B2 deployed smart contracts | `GameAssetRegistry` · `LicenseIssuer` · `LicenseEnforcer` (simulated, visible in ledger) |
| B2 one meaningful transaction | Buy license: fiat → backend verify → SC issue → 90/10 split |
| B2 contract condition enforcement | Double-license revert · resale-right revert · usage permits |
| B2 on-chain vs off-chain | ⛓ chips on every ledger row; architecture screen |
| Issue 1 ownership/licensing | Rights matrix per tier (Standard/Studio/Remix) + usage checker |
| Issue 2 AI provenance | Upload → scan → verdict bands (<30 pass · 30–50 human review · ≥50 reject · <80 trace audit) → cultural review → mint |
| Issue 3 transparent payments | Purchase steps + splits tables + full ledger overlay |
| Issue 4 interoperability | Compatibility passport per asset (platforms × formats) |
| Issue 5 security/governance | Strategy screen limitations + upgrade/governance notes |

## Demo script (5 min)

1. **Sign in as An Trần** → Upload tab → sliders: 22%/92% → submit → machine-verified → Mint.
2. Upload again at 62% → auto-**rejected** (fraud gate). At 35% → human review queue.
3. **Sign in as Chị Phạm** → Review tab → approve borderline asset → An mints it.
4. **Sign in as Bình Lê** → Market → Ronin → Buy license → watch pay→verify→issue steps, serial `#1`, split 1.710.000₫/190.000₫.
5. Buy same tier again → **smart-contract revert**. Check the ⛓ Ledger for the revert row.
6. Dashboard → usage checker: Commercial ✓, Resale ✗ (Standard tier). Studio tier resells with 10% creator royalty.
7. Footer **Reset demo data** restores seed.

## Repo map

```
src/
  types.ts config.ts        # domain contract + tunables (bands, splits, chain names)
  lib/                      # verification policy · license rights · royalty splits · ids
  store.ts                  # pure state transitions (mint, issueLicense, transfer, usage)
  app.ts persist.ts flow.ts # commit() container · localStorage · purchase orchestration
  ui.ts                     # hyperscript h() + router + formatters (no framework)
  screens/                  # market · asset · upload · dashboard · review · strategy · overlays
  style.css                 # OKLCH token system (Cobalt-family, dark)
tests/store.test.ts         # 12 bun tests: bands, splits, reverts, balances
tests/e2e_smoke.py          # 35-check Playwright journey suite
docs/SRS.md USER_GUIDE.md   # requirements spec · walkthrough
.decisions/decisions.md     # D-1..D-16 traceable decision log
```

## Gates

`bun run check` · `bun test` (12) · `bun run build` · `python tests/e2e_smoke.py` (35, needs a running server + playwright chromium).
