# User Guide — SenChain mockup

## Run it

```bash
bun install   # once (types for the dev server only)
bun run dev   # builds + serves http://localhost:5173
```

Or without rebuild: `bun run build && bun run serve`.

## Walkthrough (5 minutes)

### 0. Sign in
Top-right **Sign in** → pick a persona:
- **An Trần — creator**: uploads assets, mints, watches royalties land.
- **Bình Lê — buyer**: buys licenses with simulated VND, resells, runs usage checks.
- **Chị Phạm — reviewer**: clears the cultural-review queue.

### 1. Creator: upload + AI provenance (whiteboard §3)
**Upload** tab → fill name, model, kind → drag the **AI similarity** and **source traceability** sliders → Submit.
- similarity **<30%** & traceability **≥80%** → machine-verified instantly, **Mint** enabled.
- similarity **30–50%** (or traceability <80%) → verdict *needs review*; switch to **Chị Phạm** in Review tab, approve, then mint.
- similarity **≥50%** → auto-**rejected** with reasons (try it — this is the fraud gate).

Minting records `GameAssetRegistry.register(...)` on-chain (⛓ chip) and lists the asset.

### 2. Buyer: purchase a license (whiteboard buyer column)
**Market** → pick an asset → choose a tier (check the rights matrix!) → **Buy license** →
1. *Payment* — pick MoMo/ZaloPay/Napas (there's a "decline payment" test toggle),
2. *Verify* — backend + oracle confirm to the contract,
3. *Issue* — `LicenseIssuer.issue` mints your License NFT (serial + txHash),
4. Split lands: creator 90%, platform 10% — watch balances in the wallet.

Buying the same tier twice → **smart-contract revert** (visible in the ledger).

### 3. Resale & royalties (Issue 3)
Studio tier grants resale. As **Bình Lê** (owner), Dashboard → your license → *List for resale* → another persona buys → splits **85% seller / 10% creator royalty / 5% platform**. A Standard (non-resellable) license reverts if you try.

### 4. Usage enforcement (Issue 1)
Dashboard → *Usage checker* → try "Commercial use" vs "Modify" on a Standard tier — `LicenseEnforcer.permit` passes or **reverts** per the rights matrix. This is the token-vs-copyright distinction made interactive.

### 5. Transparency (Issues 3 & 5)
**⛓ Ledger** (top bar) → every simulated on-chain/off-chain event, contract call, and revert. Wallet overlay → balances + owned License NFTs.

### 6. Strategy & limitations (report sections 5–7)
**Strategy** tab → integrated strategy, architecture (on- vs off-chain), AI positioning, limitations (cybersecurity / ethical / legal), Y0→Yx development plan.

## Reset
Footer **Reset demo data** → fresh seed state.

## Known mockup boundaries
Everything is simulated locally (no real chain/wallet/payment/AI); see `.decisions/decisions.md` D-1 and the Strategy screen's limitations section for what production would need.
