import type { Asset, State, User } from './types';
import { CONFIG } from './config';
import { runCompat } from './lib/compatibility';

export const CREATOR = 'u-an';
export const BUYER = 'u-binh';
export const REVIEWER = 'u-chi';
export const RESELLER = 'u-minh';

/** Platform treasury pseudo-user (receives platform fee splits). */
const TREASURY: User = {
  id: 'treasury',
  name: 'Platform Treasury',
  role: 'platform',
  address: '0xTREASURY',
  vnd: 0,
};

const USERS: User[] = [
  {
    id: CREATOR,
    name: 'An Trần',
    role: 'creator',
    address: '0xA1',
    vnd: 4_200_000,
  },
  {
    id: BUYER,
    name: 'Bình Lê',
    role: 'buyer',
    address: '0xB2',
    vnd: 9_800_000,
  },
  {
    id: REVIEWER,
    name: 'Chị Phạm',
    role: 'reviewer',
    address: '0xC3',
    vnd: 1_500_000,
  },
  {
    id: RESELLER,
    name: 'Minh Vũ',
    role: 'buyer',
    address: '0xD4',
    vnd: 6_400_000,
  },
  TREASURY,
];

/** dec: precomputed specs — the seed compat runs reuse runCompat so results stay consistent. */
const HUE_SPEC = { format: 'FBX, GLB', tris: 42_300, texture: '4K PBR', animations: 12, sizeMb: 18 };
const BATTRANG_SPEC = { format: 'FBX, GLB', tris: 38_800, texture: '4K PBR', animations: 8, sizeMb: 21 };

const SEED_PLATFORMS = ['Unity', 'Unreal Engine 5', 'Godot', 'Web / GLTF'];

const hueCompat = (() => {
  const { results, failed } = runCompat(HUE_SPEC, SEED_PLATFORMS);
  return { platforms: SEED_PLATFORMS, results, status: failed > 0 ? ('needs-review' as const) : ('verified' as const), ranAt: '2026-08-12T09:20:00Z' };
})();

const battrangCompat = (() => {
  const { results, failed } = runCompat(BATTRANG_SPEC, SEED_PLATFORMS);
  return { platforms: SEED_PLATFORMS, results, status: failed > 0 ? ('needs-review' as const) : ('verified' as const), ranAt: '2026-08-12T09:20:00Z' };
})();

export const ASSETS: Asset[] = [
  {
    id: 'a-hue',
    name: 'Hue Imperial Court environment kit',
    kind: 'environment',
    blurb:
      'Full imperial-court environment: Ngo Mon gate, courtyards, lanterns and period props. Rigged set dressing, 4K PBR, game-ready for Unity and Unreal.',
    creatorId: CREATOR,
    model: 'TerraDiffusion Env v2',
    verification: {
      similarity: 9.6,
      traceability: 97,
      status: 'verified',
      model: 'AI Provenance v1',
      reasons: ['Machine-verified: similarity below the 30% band and traceability above the 80% floor'],
      compat: hueCompat,
    },
    spec: HUE_SPEC,
    images: {
      display: '/img/assets/hue-display.webp',
      gallery: ['/img/assets/hue-2.webp', '/img/assets/hue-3.webp'],
    },
    credential: {
      id: 'CRED-001',
      standard: 'ERC-721 (non-transferable)',
      network: 'Polygon',
      contractAddress: '0x82A...91F',
      tokenId: 'SNG #001',
      issuer: 'Verified Marketplace Authority',
      holder: '0xA1',
      type: 'Verified Creator Credential',
      issueDate: '2026-08-12',
      status: 'Active',
      transferable: false,
      verificationRecord: 'Verified',
      txHash: '0xab32...98d',
    },
    passport: {
      platforms: ['Unity', 'Unreal Engine 5', 'Godot'],
      formats: ['FBX', 'GLB'],
    },
    tiers: [
      {
        id: 't-std',
        name: 'Standard License',
        priceVnd: 1_900_000,
        seats: 1,
        rights: {
          commercial: true,
          modification: true,
          gameIntegration: true,
          resale: false,
        },
      },
      {
        id: 't-studio',
        name: 'Studio License',
        priceVnd: 7_600_000,
        seats: 12,
        rights: {
          commercial: true,
          modification: true,
          gameIntegration: true,
          resale: true,
        },
      },
    ],
    tokenId: 'SNG #001',
    mintTx: 'tx-seed-1',
    listed: true,
    createdAt: '2026-08-12T09:00:00Z',
  },
  {
    id: 'a-battrang',
    name: 'Bat Trang Pottery Village kit',
    kind: 'environment',
    blurb:
      'Traditional pottery village set: kilns, wheel stalls, glaze shelves and ceramic props. Hand-corrected meshes, 4K PBR textures, 8 animations.',
    creatorId: CREATOR,
    model: 'TerraDiffusion Env v2',
    verification: {
      similarity: 11.3,
      traceability: 95,
      status: 'verified',
      model: 'AI Provenance v1',
      reasons: ['Machine-verified: similarity below the 30% band and traceability above the 80% floor'],
      compat: battrangCompat,
    },
    spec: BATTRANG_SPEC,
    images: {
      display: '/img/assets/battrang-display.webp',
      gallery: ['/img/assets/battrang-2.webp', '/img/assets/battrang-3.webp'],
    },
    credential: {
      id: 'CRED-002',
      standard: 'ERC-721 (non-transferable)',
      network: 'Polygon',
      contractAddress: '0x82A...91F',
      tokenId: 'SNG #002',
      issuer: 'Verified Marketplace Authority',
      holder: '0xA1',
      type: 'Verified Creator Credential',
      issueDate: '2026-08-14',
      status: 'Active',
      transferable: false,
      verificationRecord: 'Verified',
      txHash: '0xcd54...21e',
    },
    passport: {
      platforms: ['Unity', 'Unreal Engine 5', 'Godot'],
      formats: ['FBX', 'GLB'],
    },
    tiers: [
      {
        id: 't-std',
        name: 'Standard License',
        priceVnd: 950_000,
        seats: 1,
        rights: {
          commercial: true,
          modification: true,
          gameIntegration: true,
          resale: false,
        },
      },
    ],
    tokenId: 'SNG #002',
    mintTx: 'tx-seed-2',
    listed: true,
    createdAt: '2026-08-14T09:00:00Z',
  },
];

export const emptyState = (): State => ({
  users: Object.fromEntries(USERS.map((u) => [u.id, { ...u }])),
  assets: ASSETS.map((a) => ({
    ...a,
    spec: a.spec ? { ...a.spec } : undefined,
    images: a.images ? { ...a.images, gallery: [...a.images.gallery] } : undefined,
    credential: a.credential ? { ...a.credential } : undefined,
    verification: { ...a.verification, compat: a.verification.compat ? { ...a.verification.compat, results: { ...a.verification.compat.results } } : undefined },
    tiers: a.tiers.map((t) => ({ ...t, rights: { ...t.rights } })),
  })),
  licenses: [],
  txs: [],
  sales: [],
  session: null,
  walletOpen: false,
  ledgerOpen: false,
  purchase: null,
  toasts: [],
});
