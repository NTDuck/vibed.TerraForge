# SRS — SenChain (INTE2581 Task 3 mockup)

Software Requirements Specification for the **blockchain-enabled marketplace for AI-generated game and virtual assets (Vietnam)** — mockup web prototype.

## 1. Introduction

### 1.1 Purpose
This mockup shows how a Vietnamese marketplace for AI-generated game assets can use blockchain, smart contracts and NFTs to address the five assignment issues. It is not a production system. All payments, chain calls and AI scans use simulated data.

### 1.2 Scope
Six screens (Market, Asset detail, Upload, Dashboard, Review, Strategy) plus wallet and ledger overlays. A pure TypeScript domain model backs the UI. See `../.decisions/decisions.md` for decision traceability.

### 1.3 Definitions
- **Asset**: AI-generated game or virtual content (character, skin, accessory, artwork, audio, environment).
- **License NFT**: token that conveys defined rights to an asset tier. Token ownership does not equal copyright.
- **Compatibility passport**: declared platforms × formats for an asset (Issue 4).
- **Verification layer**: off-chain AI provenance scan + human cultural review that feeds the on-chain mint.

## 2. Overall description

### 2.1 Users
| Actor | Role | Goals |
|---|---|---|
| Creator (An Trần) | uploads, mints, tracks royalties | provenance proof, 90% primary share, 10% royalty |
| Buyer (Bình Lê) | buys licenses with VND fiat, resells, checks usage | clear rights, instant license NFT |
| Reviewer (Chị Phạm) | reviews flagged assets for cultural concerns | protect ethical and legal compliance |
| Platform (treasury) | fees, dispute governance | 10% primary / 5% secondary |

### 2.2 Assumptions and dependencies
- VND fiat rails (MoMo/ZaloPay/Napas) exist off-chain. The backend checks the payment. An oracle then reports the payment to the contract.
- The AI provenance service supplies a similarity % and a source-traceability % per scan.
- The browser stores demo state in localStorage. The reset button restores the seed state.

## 3. Functional requirements

### 3.1 Verification & minting (creator)
- FR-1 The creator submits an asset with model, similarity and traceability inputs.
- FR-2 The system assesses the scan. Similarity ≥50% → **rejected**. Similarity 30–50%, or traceability <80% → **human review**. Otherwise → **machine-verified** (D-4).
- FR-3 The human reviewer approves or rejects with a note (FR-8 reviewer).
- FR-4 The system can **mint** a verified asset. It records token id `SNG #NNN` on the simulated `GameAssetRegistry.register`.
- FR-5 The creator declares the compatibility passport (platforms, formats) and license tiers (price VND, seats, rights matrix).

### 3.2 Purchasing (buyer)
- FR-6 The buyer selects a tier, sees the summary, and pays via MoMo/ZaloPay/Napas. A simulated decline is possible.
- FR-7 The backend checks the payment. `LicenseIssuer.issue` mints the License NFT (serial, txHash) and splits 90/10 (D-6).
- FR-8 A double license for the same tier produces a **reverted** tx record (D-3).
- FR-9 An insufficient VND balance fails the issuance. The system issues no license.

### 3.3 Secondary market & enforcement
- FR-10 The license holder can resell only when the tier grants `resale`. Otherwise the contract reverts (D-7).
- FR-11 A secondary sale splits 85/10/5: seller / creator royalty / platform.
- FR-12 Usage checks (`LicenseEnforcer.permit`) pass or revert per the rights matrix.

### 3.4 Transparency
- FR-13 Every action appends a transaction record with an on/off-chain flag, the contract call and the status. The ledger overlay shows all records.
- FR-14 The wallet overlay shows per-user balances and owned license NFTs.

## 4. Non-functional requirements
- NFR-1 No runtime dependencies. The JS bundle stays below 100 KB (ponytail D-9).
- NFR-2 All UI text uses English with Vietnamese sample data. Money formats as `vi-VN`.
- NFR-3 The layout works at 375/768/1280 px with no horizontal scroll.
- NFR-4 Unit tests (`bun test`, 12 cases) cover thresholds, splits, reverts and balances.
- NFR-5 The demo is deterministic. The Reset action reproduces the seed data.

## 5. Out of scope
The app mocks real wallets, real currency, real AI inference, IPFS and multi-chain bridges, or describes them in the Strategy screen.
