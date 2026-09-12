import { describe, expect, test } from 'bun:test';
import { assess } from '../src/lib/verification';
import { checkRights } from '../src/lib/license';
import { splitPrimary, splitSecondary } from '../src/lib/royalties';
import { emptyState } from '../src/seed';
import { issueLicense, mint, resolveVerification, setReview, submitAsset, transferLicense } from '../src/store';

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

describe('store flows', () => {
  test('submit → ai verdict → review → mint happy path', () => {
    const s0 = emptyState();
    const s1 = { ...s0, session: 'u-an' };
    const { state: s2, asset } = submitAsset(s1, {
      name: 'Test Sprite', kind: 'skin', blurb: 'x', model: 'SenDiffusion XL', similarity: 42, traceability: 70,
    });
    expect(asset.verification.status).toBe('awaiting-ai');
    const { state: s3 } = resolveVerification(s2, asset.id);
    expect(s3.assets.find((a) => a.id === asset.id)?.verification.status).toBe('needs-review');
    const { state: s4 } = setReview(s3, asset.id, true, 'ok');
    expect(s4.assets.find((a) => a.id === asset.id)?.verification.status).toBe('verified');
    const { state: s5 } = mint(s4, asset.id);
    expect(s5.assets.find((a) => a.id === asset.id)?.tokenId).toBeDefined();
  });

  test('double license reverts', () => {
    const s0 = emptyState();
    const asset = s0.assets[0];
    const r1 = issueLicense(s0, 'u-binh', asset.id, 't-std', 'MoMo');
    expect(r1.license).toBeDefined();
    const r2 = issueLicense(r1.state, 'u-binh', asset.id, 't-std', 'ZaloPay');
    expect(r2.error).toContain('already hold');
    expect(r2.state.txs[0].status).toBe('reverted');
  });
  test('resale of allowed tier transfers with 10% royalty to creator', () => {
    const s0 = emptyState();
    const asset = s0.assets.find((a) => a.tiers.some((t) => t.rights.resale))!;
    const tier = asset.tiers.find((t) => t.rights.resale)!;
    const r1 = issueLicense(s0, 'u-binh', asset.id, tier.id, 'MoMo');
    expect(r1.license).toBeDefined();
    const anBefore = r1.state.users['u-an'].vnd;
    const binhBefore = r1.state.users['u-binh'].vnd;
    const r1b = { ...r1.state, users: { ...r1.state.users, 'u-chi': { ...r1.state.users['u-chi'], vnd: 9_000_000 } } };
    const price = 5_000_000;
    const r2 = transferLicense(r1b, r1.license!.id, 'u-chi', price);
    expect(r2.error).toBeUndefined();
    const s2 = r2.state;
    // seller binh 85%, creator an royalty 10%, treasury 5% — chi pays and only pays
    expect(s2.users['u-binh'].vnd - binhBefore).toBe(price * 0.85);
    expect(s2.users['u-an'].vnd - anBefore).toBe(price * 0.1);
    expect(s2.licenses.find((l) => l.id === r1.license!.id)?.ownerId).toBe('u-chi');
  });

  test('resale of non-resellable tier reverts', () => {
    const s0 = emptyState();
    const asset = s0.assets.find((a) => a.tiers.some((t) => !t.rights.resale))!;
    const tier = asset.tiers.find((t) => !t.rights.resale)!;
    const r1 = issueLicense(s0, 'u-binh', asset.id, tier.id, 'MoMo');
    expect(r1.license).toBeDefined();
    const r2 = transferLicense(r1.state, r1.license!.id, 'u-an', 1_000_000);
    expect(r2.error).toContain('resale');
    expect(r2.state.licenses.find((l) => l.id === r1.license!.id)?.ownerId).toBe('u-binh');
  });
  test('insufficient balance blocks license', () => {
    const s0 = emptyState();
    const asset = s0.assets[0];
    const s1 = { ...s0, users: { ...s0.users, 'u-binh': { ...s0.users['u-binh'], vnd: 100 } } };
    const r = issueLicense(s1, 'u-binh', asset.id, 't-std', 'MoMo');
    expect(r.error).toContain('Insufficient');
  });
});
