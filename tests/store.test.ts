import { describe, expect, test } from 'bun:test';
import { assess } from '../src/lib/verification';
import { checkRights } from '../src/lib/license';
import { splitPrimary, splitSecondary } from '../src/lib/royalties';
import { criteriaFor, runCompat, compatVerdict } from '../src/lib/compatibility';
import { emptyState, ASSETS, CREATOR, BUYER, REVIEWER, RESELLER } from '../src/seed';
import {
  issueLicense,
  mint,
  resolveVerification,
  setReview,
  startCompat,
  finishCompat,
  submitAsset,
  transferLicense,
} from '../src/store';

// dec: policy thresholds under test = whiteboard AI provenance gate
// (<30% similarity pass · 30–50% human review · ≥50% reject · <80% trace → audit).

describe('verification policy', () => {
  test('low similarity + high traceability → machine-verified', () => {
    expect(assess(12.4, 96).status).toBe('ai-passed');
  });
  test('similarity in 30–50 band → human cultural review', () => {
    expect(assess(34, 84).status).toBe('needs-review');
    expect(assess(30, 84).status).toBe('needs-review');
    expect(assess(49.9, 84).status).toBe('needs-review');
  });
  test('similarity ≥ 50 → auto reject', () => {
    expect(assess(50, 84).status).toBe('rejected');
    expect(assess(72, 90).status).toBe('rejected');
  });
  test('traceability < 80 forces review even with clean similarity', () => {
    expect(assess(5, 79).status).toBe('needs-review');
  });
});

describe('compatibility layer', () => {
  const hueSpec = { format: 'FBX, GLB', tris: 42_300, texture: '4K PBR', animations: 12, sizeMb: 18 };

  test('criteriaFor Web / GLTF passes all four criteria for the Hue spec', () => {
    const cs = criteriaFor('Web / GLTF', hueSpec);
    expect(cs.map((c) => c.name)).toEqual(['Triangle budget', 'Import format', 'Texture detail', 'Download size']);
    expect(cs.every((c) => c.pass)).toBe(true);
    // detail strings carry the real numbers
    expect(cs[0].detail).toContain('42,300');
    expect(cs[0].detail).toContain('50,000');
    expect(cs[3].detail).toContain('18 MB');
    expect(cs[3].detail).toContain('25 MB');
  });

  test('oversized spec fails and routes to needs-review', () => {
    const big = { ...hueSpec, tris: 120_000 };
    const { results, failed } = runCompat(big, ['Unity']);
    expect(failed).toBeGreaterThan(0);
    expect(results['Unity'].some((c) => !c.pass)).toBe(true);
    expect(compatVerdict(failed)).toBe('needs-review');
    expect(compatVerdict(0)).toBe('verified');
  });
});

describe('license rights', () => {
  test('checkRights maps usage → right', () => {
    const std = { commercial: true, modification: false, gameIntegration: true, resale: false };
    expect(checkRights(std, 'commercial')).toBe(true);
    expect(checkRights(std, 'resale')).toBe(false);
    expect(checkRights(std, 'modification')).toBe(false);
  });
});

describe('royalty splits', () => {
  test('primary splits 90/10 and sums exactly', () => {
    const sp = splitPrimary(1_900_000, 'u-an');
    expect(sp.map((x) => x.vnd).reduce((a, b) => a + b, 0)).toBe(1_900_000);
    expect(sp[0]).toEqual({ to: 'u-an', vnd: 1_710_000, kind: 'creator' });
    expect(sp[1]).toEqual({ to: 'treasury', vnd: 190_000, kind: 'platform' });
  });
  test('secondary splits 85/10/5 and sums exactly', () => {
    const sp = splitSecondary(7_600_000, 'u-binh', 'u-an');
    expect(sp.map((x) => x.vnd).reduce((a, b) => a + b, 0)).toBe(7_600_000);
    expect(sp.find((x) => x.kind === 'royalty')?.vnd).toBe(760_000);
  });
});

describe('seed', () => {
  test('two environment kits with verified compat runs', () => {
    expect(ASSETS.length).toBe(2);
    expect(ASSETS.map((a) => a.name)).toEqual([
      'Hue Imperial Court environment kit',
      'Bat Trang Pottery Village kit',
    ]);
    const s = emptyState();
    expect(Object.keys(s.users).length).toBe(5);
    expect(s.rev).toBe(2);
    for (const a of s.assets) {
      expect(a.verification.status).toBe('verified');
      expect(a.verification.compat?.status).toBe('verified');
      expect(a.credential?.transferable).toBe(false);
    }
  });
});

describe('store flows', () => {
  test('submit → ai verdict → review → compat → mint happy path', () => {
    const s0 = emptyState();
    const s1 = { ...s0, session: 'u-an' };
    const { state: s2, asset } = submitAsset(s1, {
      name: 'Test Sprite', kind: 'skin', blurb: 'x', model: 'SenDiffusion XL', similarity: 42, traceability: 70,
      spec: { format: 'GLB', tris: 30_000, texture: 'PBR', animations: 2, sizeMb: 10 },
      platforms: ['Godot'],
    });
    expect(asset.verification.status).toBe('awaiting-ai');
    expect(asset.verification.compat?.status).toBe('pending');
    const { state: s3 } = resolveVerification(s2, asset.id);
    expect(s3.assets.find((a) => a.id === asset.id)?.verification.status).toBe('needs-review');
    const { state: s4 } = setReview(s3, asset.id, true, 'ok');
    expect(s4.assets.find((a) => a.id === asset.id)?.verification.status).toBe('verified');
    const { state: s5 } = startCompat(s4, asset.id);
    expect(s5.assets.find((a) => a.id === asset.id)?.verification.compat?.status).toBe('running');
    const { state: s6 } = finishCompat(s5, asset.id);
    const done = s6.assets.find((a) => a.id === asset.id)!;
    expect(done.verification.compat?.status).toBe('verified');
    expect(done.verification.compat?.ranAt).toBeDefined();
    expect(s6.txs[0].kind).toBe('compat-check');
    const { state: s7 } = mint(s6, asset.id);
    const minted = s7.assets.find((a) => a.id === asset.id)!;
    expect(minted.tokenId).toBe('SNG #003');
    expect(minted.credential?.standard).toBe('ERC-721 (non-transferable)');
    expect(minted.credential?.transferable).toBe(false);
  });

  test('finishCompat with failing spec emits compat-review', () => {
    const s0 = emptyState();
    const s1 = { ...s0, session: 'u-an' };
    const { state: s2, asset } = submitAsset(s1, {
      name: 'Heavy Mesh', kind: 'character', blurb: 'x', model: 'M', similarity: 5, traceability: 95,
      spec: { format: 'GLB', tris: 120_000, texture: '4K PBR', animations: 0, sizeMb: 10 },
      platforms: ['Unity'],
    });
    const s3 = resolveVerification(s2, asset.id).state;
    const s4 = setReview(s3, asset.id, true, 'ok').state;
    const s5 = startCompat(s4, asset.id).state;
    const { state: s6 } = finishCompat(s5, asset.id);
    const done = s6.assets.find((a) => a.id === asset.id)!;
    expect(done.verification.compat?.status).toBe('needs-review');
    const review = s6.txs.find((t) => t.kind === 'compat-review');
    expect(review).toBeDefined();
    expect(review?.detail).toContain('1 of 1 criteria failed');
  });

  test('mint blocked while compat is pending', () => {
    const s0 = emptyState();
    const s1 = { ...s0, session: 'u-an' };
    const { state: s2, asset } = submitAsset(s1, {
      name: 'Blocked Asset', kind: 'skin', blurb: 'x', model: 'M', similarity: 5, traceability: 95,
      platforms: ['Godot'],
    });
    const s3 = resolveVerification(s2, asset.id).state;
    const s4 = setReview(s3, asset.id, true, 'ok').state;
    expect(() => mint(s4, asset.id)).toThrow(
      'Mint blocked: both verification layers must pass (AI provenance + compatibility).',
    );
    // no mint tx was emitted
    expect(s4.txs.some((t) => t.kind === 'mint')).toBe(false);
  });

  test('mint succeeds when both layers are verified (seeded asset copy)', () => {
    const s0 = emptyState();
    // fresh submitAsset appends a third asset; mint it — seeded ones already carry token ids
    const s1 = { ...s0, session: 'u-an' };
    const { state: s2, asset } = submitAsset(s1, {
      name: 'Clean Asset', kind: 'environment', blurb: 'x', model: 'M', similarity: 5, traceability: 95,
      spec: { format: 'GLB', tris: 10_000, texture: 'PBR', animations: 0, sizeMb: 5 },
      platforms: ['Godot'],
    });
    const s3 = resolveVerification(s2, asset.id).state;
    const s4 = setReview(s3, asset.id, true, 'ok').state;
    const s5 = startCompat(s4, asset.id).state;
    const s6 = finishCompat(s5, asset.id).state;
    const { state: s7, asset: minted } = mint(s6, asset.id);
    expect(minted.tokenId).toBe('SNG #003');
    expect(minted.credential?.id).toBe('CRED-003');
    expect(minted.credential?.network).toBe('Polygon');
    expect(s7.assets.find((a) => a.id === asset.id)?.credential).toBeDefined();
  });

  test('double license reverts', () => {
    const s0 = emptyState();
    const asset = s0.assets[0];
    const r1 = issueLicense(s0, BUYER, asset.id, 't-std', 'MoMo');
    expect(r1.license).toBeDefined();
    const r2 = issueLicense(r1.state, BUYER, asset.id, 't-std', 'ZaloPay');
    expect(r2.error).toContain('already hold');
    expect(r2.state.txs[0].status).toBe('reverted');
  });

  test('resale of allowed tier transfers and increments resaleCount, then hits the limit', () => {
    const s0 = emptyState();
    const asset = s0.assets.find((a) => a.tiers.some((t) => t.rights.resale))!;
    const tier = asset.tiers.find((t) => t.rights.resale)!;
    const r1 = issueLicense(s0, BUYER, asset.id, tier.id, 'MoMo');
    expect(r1.license).toBeDefined();
    expect(r1.license!.resaleCount).toBe(0);
    // first resale to u-minh succeeds → resaleCount 1
    const r2 = transferLicense(r1.state, r1.license!.id, RESELLER, 5_000_000);
    expect(r2.error).toBeUndefined();
    const lic = r2.state.licenses.find((l) => l.id === r1.license!.id)!;
    expect(lic.ownerId).toBe(RESELLER);
    expect(lic.resaleCount).toBe(1);
    // second resale reverts with the limit error
    const r3 = transferLicense(r2.state, r1.license!.id, REVIEWER, 4_000_000);
    expect(r3.error).toBe('LicenseEnforcer reverted: resale limit reached - no further reselling is allowed.');
    expect(r3.state.licenses.find((l) => l.id === r1.license!.id)?.ownerId).toBe(RESELLER);
    const revert = r3.state.txs.find((t) => t.kind === 'resale' && t.status === 'reverted');
    expect(revert?.call?.revert).toBe('resaleLimitReached');
  });

  test('creator can buy their own tier (creator-as-buyer)', () => {
    const s0 = emptyState();
    const asset = s0.assets.find((a) => a.id === 'a-battrang')!;
    const r = issueLicense(s0, CREATOR, asset.id, 't-std', 'MoMo');
    expect(r.error).toBeUndefined();
    expect(r.license).toBeDefined();
    const lic = r.state.licenses.find((l) => l.id === r.license!.id)!;
    expect(lic.ownerId).toBe(CREATOR);
  });

  test('resale of non-resellable tier reverts', () => {
    const s0 = emptyState();
    const asset = s0.assets.find((a) => a.tiers.some((t) => !t.rights.resale))!;
    const tier = asset.tiers.find((t) => !t.rights.resale)!;
    const r1 = issueLicense(s0, BUYER, asset.id, tier.id, 'MoMo');
    expect(r1.license).toBeDefined();
    const r2 = transferLicense(r1.state, r1.license!.id, CREATOR, 1_000_000);
    expect(r2.error).toContain('resale');
    expect(r2.state.licenses.find((l) => l.id === r1.license!.id)?.ownerId).toBe(BUYER);
  });

  test('insufficient balance blocks license', () => {
    const s0 = emptyState();
    const asset = s0.assets[0];
    const s1 = { ...s0, users: { ...s0.users, [BUYER]: { ...s0.users[BUYER], vnd: 100 } } };
    const r = issueLicense(s1, BUYER, asset.id, 't-std', 'MoMo');
    expect(r.error).toContain('Insufficient');
  });
});
