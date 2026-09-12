# SRS — SenChain (INTE2581 Task 3 mockup)

Software Requirements Specification for the **blockchain-enabled marketplace for AI-generated game and virtual assets (Vietnam)** — mockup web prototype.

## 1. Introduction

### 1.1 Purpose
Demonstrate, as a clickable web mockup, how a Vietnamese marketplace for AI-generated game assets would use blockchain, smart contracts and NFTs to address the five assignment issues. Not a production system: all payments, chain calls and AI scans are simulated.

### 1.2 Scope
Six screens (Market, Asset detail, Upload, Dashboard, Review, Strategy) + wallet & ledger overlays, backed by a pure TypeScript domain model. See `../.decisions/decisions.md` for decision traceability.

### 1.3 Definitions
- **Asset**: AI-generated game/virtual content (character, skin, accessory, artwork, audio, environment).
- **License NFT**: token conveying defined rights to an asset tier; ownership ≠ copyright.
- **Compatibility passport**: declared platforms × formats for an asset (Issue 4).
- **Verification layer**: off-chain AI provenance scan + human cultural review feeding on-chain mint.

## 2. Overall description

### 2.1 Users
| Actor | Role | Goals |
|---|---|---|
| Creator (An Trần) | uploads, mints, tracks royalties | provenance proof, 90% primary share, 10% royalty |
| Buyer (Bình Lê) | buys licenses via VND fiat, resells, checks usage | clear rights, instant license NFT |
| Reviewer (Chị Phạm) | cultural review of flagged assets | protect ethical/legal compliance |
| Platform (treasury) | fees, dispute governance | 10% primary / 5% secondary |

### 2.2 Assumptions and dependencies
- VND fiat rails (MoMo/ZaloPay/Napas) exist off-chain; backend verifies payment then an oracle confirms to the contract.
- AI provenance service provides similarity % and source-traceability % per scan.
- Browser localStorage persists demo state; reset button restores seed.

## 3. Functional requirements

### 3.1 Verification & minting (creator)
- FR-1 Creator submits asset with model, similarity, traceability inputs.
- FR-2 System assesses: similarity ≥50% → **rejected**; 30–50% or traceability <80% → **human review**; else **machine-verified** (D-4).
- FR-3 Human reviewer approves/rejects with note (FR-8 reviewer).
- FR-4 Verified asset can be **minted**: token id `SNG #NNN` recorded on simulated `GameAssetRegistry.register`.
- FR-5 Creator declares compatibility passport (platforms, formats) and license tiers (price VND, seats, rights matrix).

### 3.2 Purchasing (buyer)
- FR-6 Buyer selects tier → summary → pays via MoMo/ZaloPay/Napas (simulated decline possible).
- FR-7 Backend verifies payment → `LicenseIssuer.issue` mints License NFT (serial, txHash) → splits 90/10 (D-6).
- FR-8 Double license for same tier → **reverted** tx record (D-3).
- FR-9 Insufficient VND balance → failed issuance, no license.

### 3.3 Secondary market & enforcement
- FR-10 License holder may resell if tier grants `resale`; else revert (D-7).
- FR-11 Secondary sale splits 85/10/5 seller/creator-royalty/platform.
- FR-12 Usage checks (`LicenseEnforcer.permit`) return pass or revert per rights matrix.

### 3.4 Transparency
- FR-13 Every action appends a transaction record with on/off-chain flag, contract call, status (FR-13 ledger overlay).
- FR-14 Wallet overlay shows per-user balances and owned license NFTs.

## 4. Non-functional requirements
- NFR-1 No runtime dependencies; single JS bundle < 100 KB (ponytail D-9).
- NFR-2 All UI text in English with Vietnamese-flavoured sample data; money formatted `vi-VN`.
- NFR-3 Responsive at 375/768/1280 px; no horizontal scroll.
- NFR-4 Domain logic unit-tested (`bun test`, 12 cases) covering thresholds, splits, reverts.
- NFR-5 Deterministic demo: seed data reproducible via Reset.

## 5. Out of scope
Real wallets, real currency, real AI inference, IPFS, multi-chain bridges — mocked or described in Strategy screen.
