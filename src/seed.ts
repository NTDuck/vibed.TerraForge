import type { Asset, State, User } from './types';

export const CREATOR = 'u-an';
export const BUYER = 'u-binh';
export const REVIEWER = 'u-chi';

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
  TREASURY,
];

export const ASSETS: Asset[] = [
  {
    id: 'a-ronin',
    name: 'Ronin of Đống Đa',
    kind: 'character',
    blurb:
      'Battle-ready hero mesh + PBR textures inspired by the 1789 Đống Đa campaign. Rigged, 4 LODs, game-ready.',
    creatorId: CREATOR,
    model: 'SenDiffusion XL',
    preview: '⚔️',
    verification: {
      similarity: 12.4,
      traceability: 96,
      status: 'verified',
      model: 'AI Provenance v1',
    },
    passport: {
      platforms: ['Unity', 'Unreal 5', 'Godot'],
      formats: ['FBX', 'glTF 2.0', '.unitypackage'],
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
    listed: true,
    createdAt: '2026-07-02T09:00:00Z',
  },
  {
    id: 'a-mekong',
    name: 'Mekong Dusk Skybox',
    kind: 'environment',
    blurb:
      '360° HDRI environment — dusk over the Mekong Delta, generated and manually graded. 8K equirectangular.',
    creatorId: CREATOR,
    model: 'SenDiffusion Sky',
    preview: '🌇',
    verification: {
      similarity: 8.1,
      traceability: 98,
      status: 'verified',
      model: 'AI Provenance v1',
    },
    passport: {
      platforms: ['Unity', 'Unreal 5', 'Three.js'],
      formats: ['HDR', 'EXR'],
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
    listed: true,
    createdAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'a-ta-ods',
    name: 'T’họa áo dài set',
    kind: 'skin',
    blurb:
      'Traditional-dress skin set for humanoid avatars, 3 colourways. AI-drafted, hand-finished lineart overlay.',
    creatorId: CREATOR,
    model: 'SenDiffusion XL',
    preview: '👘',
    verification: {
      similarity: 27.5,
      traceability: 92,
      status: 'verified',
      model: 'AI Provenance v1',
    },
    passport: {
      platforms: ['Unity', 'Roblox', 'VRChat'],
      formats: ['PNG atlas', 'Substance .sbsar'],
    },
    tiers: [
      {
        id: 't-std',
        name: 'Standard License',
        priceVnd: 1_200_000,
        seats: 1,
        rights: {
          commercial: true,
          modification: false,
          gameIntegration: true,
          resale: false,
        },
      },
      {
        id: 't-remix',
        name: 'Remix License',
        priceVnd: 2_400_000,
        seats: 1,
        rights: {
          commercial: true,
          modification: true,
          gameIntegration: true,
          resale: false,
        },
      },
    ],
    tokenId: 'SNG #003',
    listed: true,
    createdAt: '2026-07-18T09:00:00Z',
  },
  {
    id: 'a-lotus',
    name: 'Lotus Guardian SFX',
    kind: 'audio',
    blurb:
      'Combat-meditation sound loop, 45s. Generated stems + recorded đàn bầu samples with registered provenance.',
    creatorId: CREATOR,
    model: 'SonicBloom v2',
    preview: '🎧',
    verification: {
      similarity: 15.2,
      traceability: 88,
      status: 'verified',
      model: 'AI Provenance v1',
    },
    passport: {
      platforms: ['Wwise', 'FMOD', 'Unity'],
      formats: ['OGG', 'WAV'],
    },
    tiers: [
      {
        id: 't-std',
        name: 'Standard License',
        priceVnd: 620_000,
        seats: 1,
        rights: {
          commercial: true,
          modification: false,
          gameIntegration: true,
          resale: false,
        },
      },
    ],
    tokenId: 'SNG #004',
    listed: true,
    createdAt: '2026-07-26T09:00:00Z',
  },
  {
    id: 'a-dragon',
    name: 'Heraldic Dragon Sigil',
    kind: 'artwork',
    blurb:
      'Vector emblem for guild branding. AI-drafted geometry, artist-corrected strokes; source sketch included.',
    creatorId: CREATOR,
    model: 'VectorMuse 3',
    preview: '🐉',
    verification: {
      similarity: 34.0,
      traceability: 84,
      status: 'verified',
      model: 'AI Provenance v1',
    },
    passport: {
      platforms: ['Any engine (2D overlay)'],
      formats: ['SVG', 'PNG 4K'],
    },
    tiers: [
      {
        id: 't-std',
        name: 'Standard License',
        priceVnd: 480_000,
        seats: 1,
        rights: {
          commercial: true,
          modification: true,
          gameIntegration: true,
          resale: false,
        },
      },
    ],
    listed: true,
    createdAt: '2026-08-01T09:00:00Z',
  },
];

export const emptyState = (): State => ({
  rev: 1,
  users: Object.fromEntries(USERS.map((u) => [u.id, { ...u }])),
  assets: ASSETS.map((a) => ({ ...a, verification: { ...a.verification }, tiers: a.tiers.map((t) => ({ ...t, rights: { ...t.rights } })) })),
  licenses: [],
  txs: [],
  sales: [],
  session: null,
  walletOpen: false,
  ledgerOpen: false,
  purchase: null,
  toasts: [],
});
