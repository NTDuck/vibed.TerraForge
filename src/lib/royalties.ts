import { CONFIG } from '../config';
import type { Split } from '../types';

/** Primary sale: creator 90% / platform 10% (enforced by LicenseIssuer.distribute). */
export function splitPrimary(priceVnd: number, creatorId: string): Split[] {
  const platform = Math.round(priceVnd * CONFIG.primarySplit.platform);
  return [
    { to: creatorId, vnd: priceVnd - platform, kind: 'creator' },
    { to: 'treasury', vnd: platform, kind: 'platform' },
  ];
}

/**
 * Secondary resale: seller 85% / creator royalty 10% / platform 5%.
 * Seller share is the remainder so splits always sum exactly to price.
 */
export function splitSecondary(priceVnd: number, sellerId: string, creatorId: string): Split[] {
  const royalty = Math.round(priceVnd * CONFIG.secondarySplit.royalty);
  const platform = Math.round(priceVnd * CONFIG.secondarySplit.platform);
  const seller = priceVnd - royalty - platform;
  return [
    { to: sellerId, vnd: seller, kind: 'seller' },
    { to: creatorId, vnd: royalty, kind: 'royalty' },
    { to: 'treasury', vnd: platform, kind: 'platform' },
  ];
}
