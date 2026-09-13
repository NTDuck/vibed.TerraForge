# User Guide — SenChain mockup

## Run it

Option A — Docker (recommended):

```bash
docker build -t senchain .
docker run -p 8080:80 senchain
```

Then open http://localhost:8080.

Option B — local development:

```bash
bun install   # once (types for the dev server only)
bun run dev   # builds + serves http://localhost:5173
```

## Walkthrough (5 minutes)

### 0. Sign in
Select the top-right **Sign in** button. Pick a persona:
- **An Trần — creator**: uploads assets, mints, watches royalties arrive.
- **Bình Lê — buyer**: buys licenses with simulated VND, resells, runs usage checks.
- **Chị Phạm — reviewer**: clears the cultural-review queue.

### 1. Creator: upload + AI provenance (whiteboard §3)
Open the **Upload** tab. Fill name, model and kind. Set the **AI similarity** and **source traceability** sliders. Select Submit.
- Similarity **below 30%** and traceability **80% or higher** → the verdict is machine-verified at once. The **Mint** button appears.
- Similarity **30–50%** (or traceability below 80%) → the verdict needs review. Switch to **Chị Phạm** in the Review tab, approve, then mint.
- Similarity **50% or higher** → the system rejects the asset with reasons. This is the fraud gate.

Minting records `GameAssetRegistry.register(...)` on-chain (⛓ chip) and lists the asset.

### 2. Buyer: purchase a license (whiteboard buyer column)
**Market** → pick an asset → choose a tier (read the rights matrix) → **Buy license**:
1. *Payment* — pick MoMo/ZaloPay/Napas. A "decline payment" test toggle exists.
2. *Check* — the backend and the oracle pass the payment to the contract.
3. *Issue* — `LicenseIssuer.issue` mints your License NFT (serial + txHash).
4. The split arrives: creator 90%, platform 10%. The wallet shows the balances.

Buying the same tier twice → **smart-contract revert** (visible in the ledger).

### 3. Resale & royalties (Issue 3)
A Studio tier grants resale. Sign in as **Bình Lê** (owner). Open Dashboard → your license → *List for resale*. Another persona buys. The sale splits **85% seller / 10% creator royalty / 5% platform**. A Standard (non-resellable) license reverts if you try.

### 4. Usage enforcement (Issue 1)
Dashboard → *Usage checker*. Try "Commercial use" and "Modify" on a Standard tier. `LicenseEnforcer.permit` passes or **reverts** per the rights matrix. This demonstrates the token-vs-copyright distinction.

### 5. Transparency (Issues 3 & 5)
The **⛓ Ledger** (top bar) shows every simulated on-chain/off-chain event, contract call and revert. The wallet overlay shows balances and owned License NFTs.

### 6. Strategy & limitations (report sections 5–7)
The **Strategy** tab shows the integrated strategy, the architecture (on-chain vs off-chain), AI positioning, limitations (cybersecurity / ethical / legal) and the Y0→Yx development plan.

## Reset
The footer button **Reset demo data** restores the seed state.

## Known mockup boundaries
The app simulates everything locally. There is no real chain, wallet, payment, or AI. See `.decisions/decisions.md` D-1 and the Strategy screen limitations for the production requirements.
