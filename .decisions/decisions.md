# Decision Log — SenChain mockup

Every architectural decision, its source (assignment / whiteboard / user rule), and the alternative rejected. Traceability contract: code carries `// dec:` comments referencing a `D-<n>` id here.

| ID | Decision | Source | Alternatives rejected | Consequence |
|----|----------|--------|----------------------|-------------|
| D-1 | Mockup web prototype, not a live chain | User: "just need mockup web for the prototype" | Hardhat + testnet deploy (slow, wallet friction) | All chain calls simulated in `store.ts`; tx records rendered as if on-chain |
| D-2 | On-chain vs off-chain is a first-class state bit (`Tx.onChain`) | Assignment B2: "Distinguish between on-chain and off-chain functions" | Prose-only distinction | Every ledger row shows ⛓/off-chain chip; screenshots for report |
| D-3 | Smart-contract guards simulated with revert records (`status: 'reverted'`, `require`/`revert` in `call`) | B2: "enforcement of at least one smart-contract condition" | Only happy path | Double-license, non-resellable transfer, and usage-permit denials produce visible revert rows + toasts |
| D-4 | Verification band: similarity <30 pass · 30–50 human review · ≥50 reject; traceability <80 → audit | Whiteboard §3 ("AI provenance … <30% … <80% … 50% simi") | Single-threshold gate | `src/lib/verification.ts` `assess()`; unit-tested boundaries |
| D-5 | Buyer flow: fiat (VND: MoMo/ZaloPay/Napas) → backend verify → SC issues license + splits | Whiteboard §Buyer column (fiat gateway, backend verify, SM executes, license NFT) | Direct crypto-only checkout (Vietnam users mostly fiat) | `src/flow.ts` orchestrates 4 visible steps |
| D-6 | Splits: primary 90/10 creator/platform; secondary 85/10/5 seller/royalty/platform | Whiteboard ("Receive royalties", assignment Issue 3) | Flat platform fee | `src/lib/royalties.ts`; remainder-based so splits always sum exactly |
| D-7 | Rights tiers (Standard/Studio/Remix) with per-right booleans; usage checks enforced via `LicenseEnforcer.permit` | Assignment Issue 1 (token ownership ≠ copyright ≠ license) | Assume full ownership transfer | `src/lib/license.ts`; dashboard usage-checker demo |
| D-8 | AI provenance verdict bands + human cultural reviewer queue | Whiteboard ("human cultural reviewer", integrate industry talk) | Pure AI auto-accept | Reviewer role + review screen; assignment B3 hook |
| D-9 | No framework: hyperscript `h()` + `commit()` store + hash router | User rule: ponytail (minimal); mockup scope | React/Vite (extra tooling for 6 screens) | `src/ui.ts`, `src/app.ts`; zero runtime deps |
| D-10 | Cobalt-style dark theme, Space Grotesk display + mono data, OKLCH tokens only | Hallmark discipline (locked tokens, no mid-render improvisation) | Tailwind/Inter defaults (AI-slop) | `src/style.css` `:root` tokens; every color via `var(--…)` |
| D-11 | Simulated delays (600–700 ms) between purchase steps | Whiteboard buyer flow stages (payment → verify → issue) | Instant state jump | Visible stage progress; `CONFIG.demoSpeed` scales/tests |
| D-12 | localStorage persistence, fail-closed validation | Demo usability across refreshes | Server/session | `src/persist.ts` validates shape, else fresh state |
| D-13 | State shape versioned (`State.rev`) | Safe future migrations | None | `CONFIG.storeKey` bumps on breaking change |
| D-14 | Wallet overlay = sign-in (role picker) + balances; Ledger overlay = full tx history | B2 prototype needs: user roles, one meaningful tx | Full MetaMask integration | `screens/overlays.ts`; Escape closes |
| D-15 | Compatibility passport per asset (platforms × formats) | Whiteboard §compatibility passport; Issue 4 | Skip (interop covered in strategy only) | Asset detail shows passport; upload form edits it |
| D-16 | `// dec:` inline comments + this log | User rule: traceable decisions | None | Every module header links decisions to code |

## Requirement → implementation trace

| Requirement (source) | Where implemented |
|---|---|
| Prototype: user roles (B2) | 3 seeded users; wallet overlay sign-in |
| Deployed smart contract (B2) | 3 simulated contracts in `CONFIG.chain` |
| One meaningful transaction (B2) | Purchase flow → license issue + royalty split |
| Contract condition enforcement (B2) | License cap, resale right, usage permits (revert records) |
| On/off-chain distinction (B2) | `Tx.onChain` + chips in ledger/UI |
| AI provenance (whiteboard §3) | Upload screen scan → verdict bands → review queue → mint |
| Fiat gateway + backend verify (whiteboard) | Purchase steps 1–2 |
| License NFT + royalties (whiteboard) | `issueLicense`, `transferLicense` |
| Limitations: cyber/ethical/legal (whiteboard §6) | Strategy screen section |
| Roadmap Y0→Yx + phases (whiteboard §7) | Strategy screen timeline |
