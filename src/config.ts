export const REV = 1;

export const CONFIG = {
  storeKey: 'senchain-mock-v1',
  /** multiplier applied to simulated delays. Tests set 0 */
  demoSpeed: 1,
  aiSimilarity: { passBelow: 30, rejectAt: 50 },
  sourceTraceabilityMin: 80,
  primarySplit: { creator: 0.9, platform: 0.1 },
  secondarySplit: { royalty: 0.1, platform: 0.05 },
  chain: {
    name: 'SenChain Testnet',
    asset: 'GameAssetRegistry',
    license: 'LicenseIssuer',
    enforcer: 'LicenseEnforcer',
  },
  fiatMethods: ['MoMo', 'ZaloPay', 'Napas Card'],
};
