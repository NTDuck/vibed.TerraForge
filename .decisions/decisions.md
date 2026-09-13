# Decision Log — SenChain mockup

Every architectural decision, its source (assignment / whiteboard / user rule), and the rejected alternative. Traceability contract: code carries `// dec:` comments that reference a `D-<n>` id from this file.

| ID | Decision | Source | Alternatives rejected | Consequence |
|----|----------|--------|----------------------|-------------|
| D-1 | Mockup web prototype, not a live chain | User: "just need mockup web for the prototype" | Hardhat + testnet deploy (slow, wallet friction) | All chain calls run simulated in `store.ts`. Tx records render as if on-chain |
| D-2 | On-chain vs off-chain is a first-class state bit (`Tx.onChain`) | Assignment B2: "Distinguish between on-chain and off-chain functions" | Prose-only distinction | Every ledger row shows a ⛓/off-chain chip. Screenshots for the report |
| D-3 | Smart-contract guards produce revert records (`status: 'reverted'`, `require`/`revert` in `call`) | B2: "enforcement of at least one smart-contract condition" | Only the happy path | Double-license, non-resellable transfer and usage-permit denials produce visible revert rows and toasts |
| D-4 | Verification bands: similarity below 30 pass · 30–50 human review · 50+ reject. Traceability below 80 → audit | Whiteboard §3 ("AI provenance … <30% … <80% … 50% simi") | Single-threshold gate | `src/lib/verification.ts` `assess()`. Unit-tested boundaries |
| D-5 | Buyer flow: fiat (VND: MoMo/ZaloPay/Napas) → backend check → SC issues license + splits | Whiteboard §Buyer column (fiat gateway, backend check, SM executes, license NFT) | Direct crypto-only checkout (Vietnam users mostly fiat) | `src/flow.ts` orchestrates 4 visible steps |
| D-6 | Splits: primary 90/10 creator/platform. Secondary 85/10/5 seller/royalty/platform | Whiteboard ("Receive royalties", assignment Issue 3) | Flat platform fee | `src/lib/royalties.ts`. Remainder-based, so splits always sum exactly |
| D-7 | Rights tiers (Standard/Studio/Remix) with per-right booleans. Usage checks enforced via `LicenseEnforcer.permit` | Assignment Issue 1 (token ownership ≠ copyright ≠ license) | Assume full ownership transfer | `src/lib/license.ts`. Dashboard usage-checker demo |
| D-8 | AI provenance verdict bands + human cultural reviewer queue | Whiteboard ("human cultural reviewer", integrate industry talk) | Pure AI auto-accept | Reviewer role + review screen. Assignment B3 hook |
| D-9 | No framework: hyperscript `h()` + `commit()` store + hash router | User rule: ponytail (minimal). Mockup scope | React/Vite (extra tooling for 6 screens) | `src/ui.ts`, `src/app.ts`. Zero runtime deps |
| D-11 | Simulated delays (600–700 ms) between purchase steps | Whiteboard buyer flow stages (payment → check → issue) | Instant state jump | Visible stage progress. `CONFIG.demoSpeed` scales for tests |
| D-12 | localStorage persistence, fail-closed shape validation | Demo usability across refreshes | Server/session | `src/persist.ts` checks the shape, else fresh state |
| D-13 | State shape versioned (`State.rev`) | Safe future migrations | None | `CONFIG.storeKey` bumps on a breaking change |
| D-14 | Wallet overlay = sign-in (role picker) + balances. Ledger overlay = full tx history | B2 prototype needs: user roles, one meaningful tx | Full MetaMask integration | `screens/overlays.ts`. Escape closes |
| D-15 | Compatibility passport per asset (platforms × formats) | Whiteboard §compatibility passport. Issue 4 | Skip (interop covered in strategy only) | Asset detail shows the passport. Upload form edits it |
| D-16 | `// dec:` inline comments + this log | User rule: traceable decisions | None | Every module header links decisions to code |
| D-17 | Docker two-stage build: Bun compiles the bundle, nginx serves static files | User rule: "users just need to run docker and open website" | `bun run serve` in the container (heavier runtime image) | `Dockerfile` + `nginx.conf`. Users run `docker run -p 8080:80` and open the site |
| D-18 | All English docs and UI strings follow ASD-STE100 (structural rules, strict mode) | User rule: "ensure every message in code & every docs adhere to it" | No controlled language | `tools/ste-lint.sh` checks docs + extracted UI strings. `// dec:` comments are internal and stay free-form |

## Requirement → implementation trace

| Requirement (source) | Where implemented |
|---|---|
| Prototype: user roles (B2) | 3 seeded users. Wallet overlay sign-in |
| Deployed smart contract (B2) | 3 simulated contracts in `CONFIG.chain` |
| One meaningful transaction (B2) | Purchase flow → license issue + royalty split |
| Contract condition enforcement (B2) | License cap, resale right, usage permits (revert records) |
| On/off-chain distinction (B2) | `Tx.onChain` + chips in ledger/UI |
| AI provenance (whiteboard §3) | Upload screen scan → verdict bands → review queue → mint |
| Fiat gateway + backend check (whiteboard) | Purchase steps 1–2 |
| License NFT + royalties (whiteboard) | `issueLicense`, `transferLicense` |
| Limitations: cyber/ethical/legal (whiteboard §6) | Strategy screen section |
| Roadmap Y0→Yx + phases (whiteboard §7) | Strategy screen timeline |
| Docker deliverable (user rule) | `Dockerfile`, `nginx.conf`, verified with the full e2e suite against the container |
