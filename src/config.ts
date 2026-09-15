export const REV = 2;

export const CONFIG = {
  storeKey: 'terraforge-mock-v1',
  /** multiplier applied to simulated delays. Tests set 0 */
  demoSpeed: 1,
  aiSimilarity: { passBelow: 30, rejectAt: 50 },
  sourceTraceabilityMin: 80,
  primarySplit: { creator: 0.9, platform: 0.1 },
  secondarySplit: { royalty: 0.1, platform: 0.05 },
  chain: {
    name: 'TerraForge',
    network: 'Polygon',
    asset: 'GameAssetRegistry',
    license: 'LicenseIssuer',
    enforcer: 'LicenseEnforcer',
    auditLedger: 'SERSE Audit Ledger',
  },
  fiatMethods: ['MoMo', 'ZaloPay', 'Napas Card'],
  /** engine targets for the compatibility verification layer */
  compatPlatforms: ['Unity', 'Unreal Engine 5', 'Godot', 'Web / GLTF', 'Roblox'],
  /** max times a resellable license may change hands */
  maxResales: 1,
} as const;
