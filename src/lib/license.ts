import type { LicenseRights } from '../types';

export type Usage = 'commercial' | 'modification' | 'game-integration' | 'resale';

export const USAGES: Usage[] = ['commercial', 'modification', 'game-integration', 'resale'];

export const USAGE_LABEL: Record<Usage, string> = {
  commercial: 'Commercial use',
  modification: 'Modify / create derivatives',
  'game-integration': 'Integrate into a shipped game',
  resale: 'Resell / transfer license',
};

export const USAGE_RIGHT: Record<Usage, keyof LicenseRights> = {
  commercial: 'commercial',
  modification: 'modification',
  'game-integration': 'gameIntegration',
  resale: 'resale',
};

export function checkRights(rights: LicenseRights, usage: Usage): boolean {
  return rights[USAGE_RIGHT[usage]];
}
