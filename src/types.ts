export type Role = 'creator' | 'buyer' | 'reviewer' | 'platform';

export interface User {
  id: string;
  name: string;
  role: Role;
  address: string;
  vnd: number;
}

export type AssetKind = 'character' | 'skin' | 'accessory' | 'artwork' | 'audio' | 'environment';

export type VerificationStatus = 'awaiting-ai' | 'ai-passed' | 'needs-review' | 'rejected' | 'verified';

export interface Verification {
  /** % perceptual overlap with known registered works — lower is better */
  similarity: number;
  /** % of source material with verified provenance/licence — higher is better */
  traceability: number;
  status: VerificationStatus;
  model: string;
  /** human-readable assessment reasons (set at scan time) */
  reasons?: string[];
}

export interface Review {
  reviewerId: string;
  approved: boolean;
  note: string;
  at: string;
}

export interface LicenseRights {
  commercial: boolean;
  modification: boolean;
  gameIntegration: boolean;
  resale: boolean;
}

export interface LicenseTier {
  id: string;
  name: string;
  priceVnd: number;
  seats: number;
  rights: LicenseRights;
}

export interface Passport {
  platforms: string[];
  formats: string[];
}

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  blurb: string;
  creatorId: string;
  model: string;
  /** dec: legacy emoji field, superseded by lib/glyph glyphFor(kind). Optional for stored-state compat. */
  preview?: string;
  verification: Verification;
  review?: Review;
  passport: Passport;
  tiers: LicenseTier[];
  tokenId?: string;
  mintTx?: string;
  listed: boolean;
  createdAt: string;
}

export interface LicenseNft {
  id: string;
  assetId: string;
  tierId: string;
  ownerId: string;
  serial: number;
  issuedAt: string;
  txHash: string;
}

export type TxKind =
  | 'mint'
  | 'license-issue'
  | 'royalty'
  | 'resale'
  | 'ai-scan'
  | 'review'
  | 'payment'
  | 'verify-payment'
  | 'usage';

export type TxStatus = 'confirmed' | 'reverted';

export interface ContractCall {
  contract: string;
  fn: string;
  args: string[];
  require?: string;
  revert?: string;
}

export interface Tx {
  id: string;
  ts: string;
  kind: TxKind;
  onChain: boolean;
  label: string;
  detail: string;
  status: TxStatus;
  call?: ContractCall;
}

export interface Split {
  to: string;
  vnd: number;
  kind: 'creator' | 'platform' | 'seller' | 'royalty';
}

export interface Sale {
  id: string;
  assetId: string;
  tierId: string;
  buyerId: string;
  sellerId?: string;
  grossVnd: number;
  splits: Split[];
  primary: boolean;
  ts: string;
}

export interface PurchaseState {
  assetId: string;
  tierId: string;
  step: 'summary' | 'paying' | 'verifying' | 'issuing' | 'done' | 'failed';
  failPayment: boolean;
  method?: string;
  error?: string;
  licenseId?: string;
  splits?: Split[];
}

export interface Toast {
  id: string;
  kind: 'ok' | 'warn' | 'err';
  msg: string;
}

export interface State {
  rev: number;
  users: Record<string, User>;
  assets: Asset[];
  licenses: LicenseNft[];
  /** newest first */
  txs: Tx[];
  sales: Sale[];
  session: string | null;
  walletOpen: boolean;
  ledgerOpen: boolean;
  purchase: PurchaseState | null;
  toasts: Toast[];
}
