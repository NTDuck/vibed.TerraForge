import type { CompatCriterion, TechSpec } from '../types';

/**
 * dec: compatibility verification layer — deterministic per-engine budgets.
 * Pure module: no DOM, no state. Same spec + platform always yields the same result.
 */

interface Budget {
  maxTris: number;
  /** required: at least one spec.format token must appear here */
  formats: string[];
  /** texture rule: 'pbr' requires PBR in the texture string, 'atlas' rejects 4K/8K atlas sizes */
  texture: 'pbr' | 'atlas' | 'detail';
  maxSizeMb?: number;
}

const BUDGETS: Record<string, Budget> = {
  Unity: { maxTris: 100_000, formats: ['FBX', 'unitypackage', 'GLB'], texture: 'pbr' },
  'Unreal Engine 5': { maxTris: 1_000_000, formats: ['FBX', 'GLB'], texture: 'pbr' },
  Godot: { maxTris: 200_000, formats: ['GLB', 'GLTF'], texture: 'pbr' },
  'Web / GLTF': { maxTris: 50_000, formats: ['GLB'], texture: 'detail', maxSizeMb: 25 },
  Roblox: { maxTris: 20_000, formats: ['FBX', 'OBJ'], texture: 'atlas' },
};

const hasFormat = (spec: TechSpec, formats: string[]): boolean => {
  const tokens = spec.format.toUpperCase().split(/[\s,;]+/);
  return formats.some((f) => tokens.includes(f.toUpperCase()));
};

const fmtNum = (n: number): string => n.toLocaleString('en-US');

/** One criterion per budget rule. Detail strings always carry the real numbers. */
export function criteriaFor(platform: string, spec: TechSpec): CompatCriterion[] {
  const budget = BUDGETS[platform];
  if (!budget) {
    return [{ name: `Unknown platform ${platform}`, pass: false, detail: `No compatibility budget is defined for ${platform}.` }];
  }

  const criteria: CompatCriterion[] = [];

  const trisPass = spec.tris <= budget.maxTris;
  criteria.push({
    name: 'Triangle budget',
    pass: trisPass,
    detail: `${fmtNum(spec.tris)} tris vs ${fmtNum(budget.maxTris)} budget for ${platform} — ${trisPass ? 'within budget' : 'over budget by ' + fmtNum(spec.tris - budget.maxTris)}`,
  });

  const formatPass = hasFormat(spec, budget.formats);
  criteria.push({
    name: 'Import format',
    pass: formatPass,
    detail: `Asset ships ${spec.format}; ${platform} imports ${budget.formats.join(' / ')} — ${formatPass ? 'supported format found' : 'no supported format found'}`,
  });

  if (budget.texture === 'pbr') {
    const pass = spec.texture.toUpperCase().includes('PBR');
    criteria.push({
      name: 'PBR texture set',
      pass,
      detail: `Texture "${spec.texture}" vs PBR requirement for ${platform} — ${pass ? 'PBR materials present' : 'PBR materials missing'}`,
    });
  } else if (budget.texture === 'atlas') {
    const pass = !/\b(4K|8K)\b/i.test(spec.texture);
    criteria.push({
      name: 'Texture atlas size',
      pass,
      detail: `Texture "${spec.texture}" vs Roblox limit (no 4K/8K atlases) — ${pass ? 'atlas size allowed' : 'atlas size rejected'}`,
    });
  } else {
    const pass = spec.texture.trim().length > 0;
    criteria.push({
      name: 'Texture detail',
      pass,
      detail: `Texture "${spec.texture}" recorded for web streaming — ${pass ? 'detail present' : 'no texture detail'}`,
    });
  }

  if (budget.maxSizeMb !== undefined) {
    const sizePass = spec.sizeMb <= budget.maxSizeMb;
    criteria.push({
      name: 'Download size',
      pass: sizePass,
      detail: `${spec.sizeMb} MB vs ${budget.maxSizeMb} MB limit for ${platform} — ${sizePass ? 'within limit' : 'over limit by ' + (spec.sizeMb - budget.maxSizeMb).toFixed(1) + ' MB'}`,
    });
  }

  return criteria;
}

export interface CompatOutcome {
  results: Record<string, CompatCriterion[]>;
  failed: number;
}

/** Runs every platform against the spec. failed = criteria that did not pass. */
export function runCompat(spec: TechSpec, platforms: string[]): CompatOutcome {
  const results: Record<string, CompatCriterion[]> = {};
  let failed = 0;
  for (const p of platforms) {
    const criteria = criteriaFor(p, spec);
    results[p] = criteria;
    failed += criteria.filter((c) => !c.pass).length;
  }
  return { results, failed };
}

/** failed > 0 means at least one criterion needs human review. */
export function compatVerdict(failed: number): 'verified' | 'needs-review' {
  return failed > 0 ? 'needs-review' : 'verified';
}
