# User Guide — TerraForge mockup

## Run it

Option A — Docker (recommended):

```bash
docker build -t terraforge .
docker run -p 8080:80 terraforge
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
- **Minh Vũ — buyer 2**: receives resold licenses.

### 1. Pick a color theme
The topbar holds the theme select. It lists the custom **TerraForge Tiffany** scheme plus 339 Tinted Theming base16 schemes. The default is **Flexoki Light**. Pick a scheme and the UI re-tints at once. Your choice persists in localStorage.

### 2. Creator: upload + dual verification
Sign in as **An Trần**. Open the **Upload** tab:
1. Fill name, blurb and kind. Pick a generative model.
2. Paste a display image URL. Add gallery URLs, one per line (both optional).
3. Keep the target platform checkboxes as needed. All platforms come pre-checked.
4. Keep the **AI similarity** slider at 22 and **source traceability** at 92. Select Submit.
5. The compatibility card appears. Select **Run Compatibility check**. The engine checks run and print criterion rows per platform.
6. Both layers now read green. The **Mint** button unlocks. Select it. The asset records `SNG #NNN` on Polygon.

Minting writes the credential record (id, network, contract address, tx hash) into the asset detail page.

The verdict bands: similarity **below 30%** and traceability **80% or higher** → machine-verified at once. Similarity **30–50%**, or traceability below 80% → the asset needs review. Similarity **50% or higher** → the system rejects the asset. This is the fraud gate.

### 3. Reviewer: preview + verdict
Sign in as **Chị Phạm**. Open the **Review** tab. Each queue card holds the asset gallery, a spec mini-table, the AI reasons and the **Compatibility findings** rows. Read the preview, optionally add a note, then select **Approve** or **Reject**. A fail routes the asset to human review before mint.

### 4. Buyer: purchase a license
Sign in as **Bình Lê**. Open **Market** → pick an asset → choose a tier (read the rights matrix) → **Buy license**:
1. *Payment* — pick MoMo/ZaloPay/Napas. A "simulate declined payment" toggle exists. Decline keeps the license unissued. Select **Retry** to pay again.
2. *Check* — the backend and the oracle pass the payment to the contract.
3. *Issue* — `LicenseIssuer.issue` mints your License NFT (serial + txHash).
4. The done banner reads **License issued** with the serial `#N`. The Hue Standard split is 1.710.000₫ to the creator and 190.000₫ to the platform.

Buying the same tier twice → **smart-contract revert** (visible in the ledger).

### 5. Resale to Minh Vũ (Issue 3)
Sign in as **Bình Lê**. Open **Dashboard** → your license. Select the transfer target (defaults to **Minh Vũ**). The button reads **Transfer to Minh Vũ**. Select it. Minh Vũ now owns the license.

Rules:
- The Hue **Standard** tier blocks resale. The contract reverts with a "resale rights" message.
- The Hue **Studio** tier allows one resale. The sale pays a **10% royalty** to the creator (85/10/5 split: seller / creator / platform).
- A **second** resale of the same license reverts with "resale limit reached". The limit is 1.

### 6. Usage enforcement (Issue 1)
Dashboard → *Check permit*. Try "Commercial use" and "Modify" on a Standard tier. `LicenseEnforcer.permit` passes or **reverts** per the rights matrix. This demonstrates the token-vs-copyright distinction.

### 7. Transparency (Issues 3 & 5)
The **⛓ Ledger** button (top bar) opens the **SERSE Audit Ledger** overlay. It lists every simulated on-chain/off-chain event, contract call and revert. The newest settled row glows. The wallet overlay lists balances and owned License NFTs.

### 8. Asset detail + smart contracts
Open an asset from the Market. The page opens with the gallery (prev/next arrows, thumbnails) and four accordion blocks. Overview stays open. Open **Blockchain / Settlement Record** and select the contract address or tx hash. The SERSE overlay opens. The **Smart contracts** screen lists the three simulated contracts with their Solidity surfaces.

### 9. Strategy & limitations (report sections 5–7)
The **Strategy** tab presents the integrated strategy, the architecture (on-chain vs off-chain), limitations (cybersecurity / ethical / legal) and the Y0→Yx development plan.

## Reset
The footer button **Reset demo data** restores the seed state.

## Known mockup boundaries
The app simulates everything locally. There is no real chain, wallet, payment, or AI. See `.decisions/decisions.md` D-1 and the Strategy screen limitations for the production requirements.
