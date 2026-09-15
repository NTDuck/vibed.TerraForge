import { CONFIG } from './config';
import { assess } from './lib/verification';
import { checkRights, type Usage } from './lib/license';
import { splitPrimary, splitSecondary } from './lib/royalties';
import { now, txHash, uid } from './lib/id';
import { compatVerdict, runCompat } from './lib/compatibility';
import { CREATOR, REVIEWER } from './seed';
import type {
  Asset,
  CompatRun,
  Credential,
  LicenseNft,
  LicenseTier,
  Sale,
  State,
  TechSpec,
  Tx,
  TxKind,
  User,
  Verification,
} from './types';

/** Pure state-transition module: every mutation goes through these functions. */

const emit = (
  s: State,
  kind: TxKind,
  label: string,
  detail: string,
  opts: Partial<Tx> = {},
): Tx => {
  const tx: Tx = {
    id: uid('tx'),
    ts: now(),
    kind,
    onChain: false,
    label,
    detail,
    status: 'confirmed',
    ...opts,
  };
  s.txs.unshift(tx);
  return tx;
};

export const pay = (s: State, userId: string, amount: number): boolean => {
  const u = s.users[userId];
  if (!u || u.vnd < amount) return false;
  u.vnd -= amount;
  return true;
};

export const credit = (s: State, userId: string, amount: number): void => {
  const u = s.users[userId];
  if (u) u.vnd += amount;
};

// ---------- sessions ----------

export function login(s: State, userId: string): State {
  return { ...s, session: userId };
}

export function logout(s: State): State {
  return { ...s, session: null };
}

export function submitAsset(
  s: State,
  input: {
    name: string;
    kind: Asset['kind'];
    blurb: string;
    model: string;
    similarity: number;
    traceability: number;
    spec?: TechSpec;
    platforms: string[];
  },
): { state: State; asset: Asset } {
  const scan: Verification = {
    similarity: input.similarity,
    traceability: input.traceability,
    status: 'awaiting-ai',
    model: 'AI Provenance v1',
  };
  const asset: Asset = {
    id: uid('a'),
    name: input.name,
    kind: input.kind,
    blurb: input.blurb,
    creatorId: s.session ?? CREATOR,
    model: input.model,
    verification: scan,
    passport: { platforms: [], formats: [] },
    tiers: [],
    listed: false,
    createdAt: now(),
  };
  if (input.spec) asset.spec = input.spec;
  if (input.platforms.length) {
    const compat: CompatRun = { platforms: input.platforms, results: {}, status: 'pending' };
    asset.verification = { ...scan, compat };
  }
  const next = { ...s, assets: [...s.assets, asset] };
  emit(next, 'ai-scan', `AI provenance scan — "${input.name}"`, 'Off-chain: TerraDiffusion perceptual match + source audit');
  return { state: next, asset };
}

export function resolveVerification(
  s: State,
  assetId: string,
): { state: State; asset: Asset } {
  const asset = s.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error('asset not found');
  const verdict = assess(asset.verification.similarity, asset.verification.traceability);
  const verification: Verification = { ...asset.verification, status: verdict.status, reasons: verdict.reasons };
  const assets = s.assets.map((a) => (a.id === assetId ? { ...a, verification } : a));
  const next = { ...s, assets };
  emit(next, 'ai-scan', `AI verdict — "${asset.name}"`, `Similarity ${verification.similarity}% · traceability ${verification.traceability}% → ${verdict.status}`);
  return { state: next, asset: { ...asset, verification } };
}

export function setReview(
  s: State,
  assetId: string,
  approved: boolean,
  note: string,
): { state: State; asset: Asset } {
  const asset = s.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error('asset not found');
  const review = {
    reviewerId: REVIEWER,
    approved,
    note: note || (approved ? 'Cultural sensitivity cleared.' : 'Needs rework.'),
    at: now(),
  };
  const verification: Verification = { ...asset.verification, status: approved ? 'verified' : 'rejected' };
  const assets = s.assets.map((a) => (a.id === assetId ? { ...a, review, verification } : a));
  const next = { ...s, assets };
  emit(
    next,
    'review',
    `Cultural review — "${asset.name}"`,
    approved ? `Approved by ${s.users[REVIEWER].name}: ${review.note}` : `Rejected by ${s.users[REVIEWER].name}: ${review.note}`,
  );
  return { state: next, asset: { ...asset, review, verification } };
}


export function mint(s: State, assetId: string): { state: State; asset: Asset; tx: Tx } {
  const asset = s.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error('asset not found');
  if (
    !(asset.verification.status === 'verified' || asset.verification.status === 'ai-passed') ||
    asset.verification.compat?.status !== 'verified'
  ) {
    throw new Error('Mint blocked: both verification layers must pass (AI provenance + compatibility).');
  }
  const minted = s.assets.filter((a) => a.tokenId);
  const tokenId = `SNG #${String(minted.length + 1).padStart(3, '0')}`;
  const tx = emit(
    s,
    'mint',
    `Minted ${tokenId} — "${asset.name}"`,
    `${CONFIG.chain.asset}.register(hash(${asset.id})) — creator ${s.users[asset.creatorId]?.name ?? asset.creatorId}`,
    { onChain: true, call: { contract: CONFIG.chain.asset, fn: 'register', args: [asset.id] } },
  );
  const credential: Credential = {
    id: `CRED-${String(minted.length + 1).padStart(3, '0')}`,
    standard: 'ERC-721 (non-transferable)',
    network: CONFIG.chain.network,
    contractAddress: '0x82A...91F',
    tokenId,
    issuer: 'Verified Marketplace Authority',
    holder: s.users[asset.creatorId]?.address ?? asset.creatorId,
    type: 'Verified Creator Credential',
    issueDate: now(),
    status: 'Active',
    transferable: false,
    verificationRecord: 'Verified',
    txHash: tx.id,
  };
  const assets = s.assets.map((a) => (a.id === assetId ? { ...a, tokenId, mintTx: tx.id, listed: true, credential } : a));
  return { state: { ...s, assets }, asset: { ...asset, tokenId, mintTx: tx.id, listed: true, credential }, tx };
}

// ---------- compatibility pipeline ----------

export function startCompat(s: State, assetId: string): { state: State; asset: Asset } {
  const asset = s.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error('asset not found');
  if (!asset.verification.compat) return { state: s, asset };
  const compat: CompatRun = { ...asset.verification.compat, status: 'running' };
  const verification: Verification = { ...asset.verification, compat };
  const assets = s.assets.map((a) => (a.id === assetId ? { ...a, verification } : a));
  return { state: { ...s, assets }, asset: { ...asset, verification } };
}

export function finishCompat(s: State, assetId: string): { state: State; asset: Asset } {
  const asset = s.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error('asset not found');
  const run = asset.verification.compat;
  if (!run || !asset.spec) return { state: s, asset };
  const { results, failed } = runCompat(asset.spec, run.platforms);
  const status = compatVerdict(failed);
  const total = Object.values(results).reduce((n, cs) => n + cs.length, 0);
  const compat: CompatRun = { ...run, results, status, ranAt: now() };
  const verification: Verification = { ...asset.verification, compat };
  const assets = s.assets.map((a) => (a.id === assetId ? { ...a, verification } : a));
  const next = { ...s, assets };
  if (failed > 0) {
    emit(
      next,
      'compat-review',
      `Compatibility review — "${asset.name}"`,
      `${failed} of ${run.platforms.length} criteria failed across platforms - routed to human reviewer`,
    );
  } else {
    emit(
      next,
      'compat-check',
      `Compatibility verified — "${asset.name}"`,
      `All ${total} criteria pass (platforms: ${run.platforms.join(', ')})`,
    );
  }
  return { state: next, asset: { ...asset, verification } };
}

// ---------- purchase / licensing ----------

export function startPurchase(s: State, assetId: string, tierId: string): State {
  return {
    ...s,
    purchase: { assetId, tierId, step: 'summary', failPayment: false },
  };
}

export function setPurchaseStep(s: State, step: 'summary' | 'paying' | 'verifying' | 'issuing' | 'done' | 'failed', patch: Partial<NonNullable<State['purchase']>> = {}): State {
  if (!s.purchase) return s;
  return { ...s, purchase: { ...s.purchase, step, ...patch } };
}

export function issueLicense(
  s: State,
  buyerId: string,
  assetId: string,
  tierId: string,
  method: string,
): { state: State; license?: LicenseNft; error?: string } {
  const asset = s.assets.find((a) => a.id === assetId);
  const tier = asset?.tiers.find((t) => t.id === tierId);
  if (!asset || !tier) return { state: s, error: 'asset or tier not found' };

  // Smart-contract guard: the buyer must not already hold an active license (revert path).
  const existing = s.licenses.find((l) => l.assetId === assetId && l.tierId === tierId && l.ownerId === buyerId);
  if (existing) {
    emit(
      s,
      'license-issue',
      `License revert — "${asset.name}"`,
      `${CONFIG.chain.license}.issue() reverted: address already holds an active license`,
      { onChain: true, status: 'reverted', call: { contract: CONFIG.chain.license, fn: 'issue', args: [assetId, tierId], require: '!alreadyLicensed', revert: 'alreadyLicensed' } },
    );
    return { state: s, error: 'LicenseIssuer reverted: you already hold this license.' };
  }

  const price = tier.priceVnd;
  if (!pay(s, buyerId, price)) {
    return { state: s, error: `Insufficient VND balance (${price.toLocaleString('vi-VN')}₫ required).` };
  }

  const splits = splitPrimary(price, asset.creatorId);
  for (const sp of splits) credit(s, sp.to, sp.vnd);
  emit(s, 'payment', `Fiat payment — ${method}`, `${price.toLocaleString('vi-VN')}₫ via ${method} (off-chain)`);
  emit(
    s,
    'verify-payment',
    `Payment verified — ${price.toLocaleString('vi-VN')}₫`,
    'Off-chain gateway → oracle reports the payment to LicenseIssuer',
  );
  const tx = emit(
    s,
    'license-issue',
    `License issued — "${asset.name}" (${tier.name})`,
    `${CONFIG.chain.license}.issue(${buyerId}, ${assetId}, ${tierId}) — enforce licenseCap, distribute 90/10`,
    { onChain: true, call: { contract: CONFIG.chain.license, fn: 'issue', args: [assetId, tierId], require: '!alreadyLicensed && msg.value == price' } },
  );
  for (const sp of splits) {
    emit(s, 'royalty', `Split → ${s.users[sp.to]?.name ?? sp.to}`, `${sp.vnd.toLocaleString('vi-VN')}₫ (${sp.kind})`, { onChain: true });
  }
  const license: LicenseNft = {
    id: uid('lic'),
    assetId,
    tierId,
    ownerId: buyerId,
    serial: s.licenses.filter((l) => l.assetId === assetId).length + 1,
    issuedAt: now(),
    txHash: txHash(),
    resaleCount: 0,
  };
  const sale: Sale = {
    id: uid('sale'),
    assetId,
    tierId,
    buyerId,
    grossVnd: price,
    splits,
    primary: true,
    ts: now(),
  };
  return { state: { ...s, licenses: [...s.licenses, license], sales: [...s.sales, sale] }, license };
}

export function transferLicense(s: State, licenseId: string, toUserId: string, priceVnd: number): { state: State; error?: string } {
  const license = s.licenses.find((l) => l.id === licenseId);
  if (!license) return { state: s, error: 'license not found' };
  const asset = s.assets.find((a) => a.id === license.assetId);
  const tier = asset?.tiers.find((t) => t.id === license.tierId);
  if (!asset || !tier) return { state: s, error: 'asset or tier not found' };

  // Smart-contract guard: resale right enforced by LicenseEnforcer (revert path).
  if (!checkRights(tier.rights, 'resale' as Usage)) {
    emit(
      s,
      'resale',
      `Resale revert — "${asset.name}"`,
      `${CONFIG.chain.enforcer}.resale() reverted: Standard License does not grant resale`,
      { onChain: true, status: 'reverted', call: { contract: CONFIG.chain.enforcer, fn: 'resale', args: [licenseId], require: 'rights.resale', revert: '!rights.resale' } },
    );
    return { state: s, error: 'LicenseEnforcer reverted: this license tier does not grant resale rights.' };
  }

  // Smart-contract guard: resale count cap enforced by LicenseEnforcer (revert path).
  if (license.resaleCount >= CONFIG.maxResales) {
    emit(
      s,
      'resale',
      `Resale revert — "${asset.name}"`,
      `${CONFIG.chain.enforcer}.resale() reverted: resale limit (${CONFIG.maxResales}) reached - this license cannot be resold again`,
      { onChain: true, status: 'reverted', call: { contract: CONFIG.chain.enforcer, fn: 'resale', args: [licenseId], require: 'resaleCount < maxResales', revert: 'resaleLimitReached' } },
    );
    return { state: s, error: 'LicenseEnforcer reverted: resale limit reached - no further reselling is allowed.' };
  }

  const price = priceVnd > 0 ? priceVnd : tier.priceVnd;
  if (!pay(s, toUserId, price)) {
    return { state: s, error: `Buyer has insufficient VND (${price.toLocaleString('vi-VN')}₫ required).` };
  }
  const splits = splitSecondary(price, license.ownerId, asset.creatorId);
  for (const sp of splits) credit(s, sp.to, sp.vnd);
  emit(s, 'payment', `Resale payment`, `${price.toLocaleString('vi-VN')}₫ (off-chain)`);
  const tx = emit(
    s,
    'resale',
    `License transferred — "${asset.name}"`,
    `${CONFIG.chain.enforcer}.resale(${licenseId}) — enforce rights.resale, royalty ${CONFIG.secondarySplit.royalty * 100}%`,
    { onChain: true, call: { contract: CONFIG.chain.enforcer, fn: 'resale', args: [licenseId], require: 'rights.resale' } },
  );
  for (const sp of splits) {
    emit(s, 'royalty', `Split → ${s.users[sp.to]?.name ?? sp.to}`, `${sp.vnd.toLocaleString('vi-VN')}₫ (${sp.kind})`, { onChain: true });
  }
  const licenses = s.licenses.map((l) => (l.id === licenseId ? { ...l, ownerId: toUserId, resaleCount: l.resaleCount + 1 } : l));
  const sale: Sale = {
    id: uid('sale'),
    assetId: license.assetId,
    tierId: license.tierId,
    buyerId: toUserId,
    sellerId: license.ownerId,
    grossVnd: price,
    splits,
    primary: false,
    ts: now(),
  };
  return { state: { ...s, licenses, sales: [...s.sales, sale] }, error: undefined };
}

export function recordUsage(s: State, licenseId: string, usage: Usage, ok: boolean): State {
  const label = usage;
  if (ok) {
    emit(
      s,
      'usage',
      `Usage check — ${label} ✓`,
      `${CONFIG.chain.enforcer}.permit(${licenseId}, ${label}) — rights.${usage} granted`,
      { onChain: true, call: { contract: CONFIG.chain.enforcer, fn: 'permit', args: [licenseId, label], require: 'rights.' + usage } },
    );
  } else {
    emit(
      s,
      'usage',
      `Usage check — ${label} ✗`,
      `${CONFIG.chain.enforcer}.permit(${licenseId}, ${label}) reverted: rights.${usage} not granted`,
      { onChain: true, status: 'reverted', call: { contract: CONFIG.chain.enforcer, fn: 'permit', args: [licenseId, label], require: 'rights.' + usage, revert: '!rights.' + usage } },
    );
  }
  return s;
}

// ---------- ui state ----------

export function toggleWallet(s: State): State {
  return { ...s, walletOpen: !s.walletOpen, ledgerOpen: false };
}

export function toggleLedger(s: State): State {
  return { ...s, ledgerOpen: !s.ledgerOpen, walletOpen: false };
}
export function closeOverlays(s: State): State {
  return { ...s, walletOpen: false, ledgerOpen: false };
}

export function toast(s: State, kind: 'ok' | 'warn' | 'err', msg: string): State {
  const t = { id: uid('t'), kind, msg };
  return { ...s, toasts: [...s.toasts, t] };
}

export function dropToast(s: State, id: string): State {
  return { ...s, toasts: s.toasts.filter((t) => t.id !== id) };
}
