# SRS — TerraForge (INTE2581 Task 3 mockup)

Software Requirements Specification for the **blockchain-enabled marketplace for AI-generated game and virtual assets (Vietnam)** — mockup web prototype.

## 1. Introduction

### 1.1 Purpose
This mockup shows how a Vietnamese marketplace for AI-generated game assets can use blockchain, smart contracts and NFTs to address the five assignment issues. It is not a production system. All payments, chain calls and AI scans use simulated data.

### 1.2 Scope
Six screens (Market, Asset detail, Upload, Dashboard, Review, Smart contracts) plus Strategy. The topbar holds the theme picker, the wallet overlay, the ledger overlay and the reset button. A pure TypeScript domain model backs the UI. See `../.decisions/decisions.md` for decision traceability.

### 1.3 Definitions
- **Asset**: an AI-generated environment kit (Hue Imperial Court, Bat Trang Pottery Village). The marketplace trades environment kits only.
- **License NFT**: token that conveys defined rights to an asset tier. Token ownership does not equal copyright.
- **Verification layer**: one of two checks an asset must pass before mint. Layer 1 is the AI provenance scan. Layer 2 is the Compatibility Passport run.
- **Compatibility Passport**: per-engine criteria (triangle budget, import format, texture rule, download size) for each target platform.
- **Credential**: non-transferable ERC-721 record minted with the asset (Polygon).

## 2. Overall description

### 2.1 Users
| Actor | Role | Goals |
|---|---|---|
| Creator (An Trần, u-an) | uploads, mints, tracks royalties | provenance proof, 90% primary share, 10% resale royalty |
| Buyer (Bình Lê, u-binh) | buys licenses with VND fiat, resells, checks usage | clear rights, instant license NFT |
| Reviewer (Chị Phạm, u-chi) | clears flagged assets with a preview and a verdict | protect ethical and legal compliance |
| Buyer 2 (Minh Vũ, u-minh) | receives resold licenses | clean second-buyer demo path |
| Platform (treasury) | fees, dispute governance | 10% primary / 5% secondary |

### 2.2 Assumptions and dependencies
- VND fiat rails (MoMo/ZaloPay/Napas) exist off-chain. The backend checks the payment. An oracle then reports the payment to the contract.
- The AI provenance service supplies a similarity % and a source-traceability % per scan.
- The compatibility service scores each target platform against deterministic engine budgets.
- The browser stores demo state in localStorage under `terraforge-mock-v1`. The reset button restores the seed state.
- The theme runtime applies one of 339 Tinted Theming base16 schemes plus the custom `terraforge-tiffany` scheme. The default is `flexoki-light`.

### 2.3 Seed data
| Asset | Tiers | Credential |
|---|---|---|
| Hue Imperial Court environment kit (a-hue) | Standard 1.900.000₫, no resale · Studio 7.600.000₫, resale allowed | CRED-001, Polygon, ERC-721 non-transferable, contract `0x82A...91F` |
| Bat Trang Pottery Village kit (a-battrang) | Standard 950.000₫, no resale | CRED-002, Polygon, ERC-721 non-transferable, contract `0x82A...91F` |

Both assets ship verified by both layers, with gallery and full spec. The form takes an image URL for the main view. The asset page renders the images.

## 3. Functional requirements

### 3.1 Verification & minting (creator)
- FR-1 The creator submits an asset with name, blurb, kind, model and target platforms. The form also takes a main image URL, gallery URLs, and the similarity and traceability sliders (defaults 22/92).
- FR-2 The system assesses the AI scan. Similarity ≥50% → **rejected**. Similarity 30–50%, or traceability <80% → **human review**. Otherwise → **machine-verified** (D-4).
- FR-3 After submit the system shows a compatibility card. The creator selects **Run Compatibility check**. The run scores every chosen platform against the engine budgets. A failed criterion routes the asset to human review.
- FR-4 The Mint button stays disabled until both layers pass. The system then records token id `SNG #NNN` on the simulated `GameAssetRegistry.register` (Polygon).
- FR-5 A mint also issues a non-transferable ERC-721 credential record. The record holds: id, standard, network, contract address, token id, issuer, holder, type, issue date, status, transferable flag, verification record, tx hash. The asset detail screen shows every field.

### 3.2 Purchasing (buyer)
- FR-6 The buyer selects a tier, sees the summary, and pays via MoMo/ZaloPay/Napas. A "simulate declined payment" toggle is present. A declined payment keeps the license unissued and the Retry action is available.
- FR-7 The backend checks the payment. `LicenseIssuer.issue` mints the License NFT (serial, txHash) and splits 90/10 (D-6). A done banner shows "License issued" and the serial #N. The Hue Standard split is 1.710.000₫ / 190.000₫.
- FR-8 A double license for the same tier produces a **reverted** tx record (D-3).

### 3.3 Secondary market & enforcement
- FR-9 The license holder can resell only when the tier grants `resale` and the resale count stays below the limit of 1 (D-7, D-22). Otherwise the contract reverts. A second resale of the same license reverts with "resale limit reached".
- FR-10 A secondary sale splits 85/10/5: seller / creator royalty / platform. The Hue Studio resale pays a 10% royalty to the creator.
- FR-11 The Dashboard shows a transfer select with every other user. It defaults to Minh Vũ. The button label reads "Transfer to \<name\>".
- FR-12 The usage checker (`Check permit`) calls `LicenseEnforcer.permit`. It passes or reverts per the rights matrix.

### 3.4 Transparency, review & contracts
- FR-13 Every action appends a transaction record with an on/off-chain flag, the contract call and the status. The ledger overlay shows the title "SERSE Audit Ledger". The newest settled row carries the `now` highlight class.
- FR-14 The wallet overlay shows per-user balances and owned license NFTs. The creator sees purchases under "My licenses" too.
- FR-15 The asset detail screen shows an image gallery with prev/next controls and thumbnails, plus four accordion blocks. Overview stays open by default. The Blockchain / Settlement Record block holds clickable `.addr` buttons for the contract address and tx hash. Each opens the SERSE overlay.
- FR-16 The Review screen shows flagged assets with a gallery, a spec table, AI reasons and a "Compatibility findings" list. The reviewer approves or rejects with an optional note.
- FR-17 The Smart contracts screen shows the three simulated contracts with their Solidity surfaces. Every call lands in the ledger.

## 4. Non-functional requirements
- NFR-1 No runtime dependencies. The JS bundle stays below 100 KB (ponytail D-9).
- NFR-2 All UI text uses English with Vietnamese sample data. Money formats as `vi-VN`.
- NFR-3 The layout works at 375/768/1280 px with no horizontal scroll.
- NFR-4 Unit tests (`bun test`, 12 cases) cover thresholds, splits, reverts and balances.
- NFR-5 The demo is deterministic. The Reset action reproduces the seed data.
- NFR-6 UI fonts are Inter for body text and headings, plus JetBrains Mono for code. Inter substitutes Amazon Ember because the Ember license does not cover this use.
- NFR-7 The UI follows an AWS-console structure on a dark baseline: page header, chip row, filter row, card grid. The accent color is Tiffany blue `#81D8D0`. The theme picker changes scheme at runtime.

## 5. Out of scope
The app mocks real wallets, real currency, real AI inference, IPFS and multi-chain bridges, or describes them in the Strategy screen.
