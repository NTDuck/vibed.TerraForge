/** dec: hand-built SVG asset glyphs (Hallmark Tier B enrichment).
 * Keyed by AssetKind. Stroke-based, 48x48 viewBox, inherits currentColor.
 * The 'preview' string field is legacy/unused — glyphFor(kind) is the render path. */
import type { AssetKind } from '../types';

function svg(inner: string, size: number): SVGSVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 48 48');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = inner;
  return el;
}

function s(variant?: 'accent' | 'faint'): string {
  if (variant === 'accent') return 'fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
  if (variant === 'faint') return 'fill="none" stroke="var(--ink-faint)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"';
  return 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
}

const GLYPHS: Record<AssetKind, string> = {
  // character: helmet silhouette with visor slit
  character: `<path d="M14 34v-8a10 10 0 0 1 20 0v8" ${s()}
    /><path d="M12 34h24v4H12z" ${s()}
    /><path d="M19 26h10" ${s('accent')}
    /><circle cx="24" cy="14" r="2" ${s('accent')} />`,
  // skin: layered garment panels
  skin: `<path d="M18 8h12l6 10-6 4v18H18V22l-6-4z" ${s()}
    /><path d="M24 8v32" ${s('faint')}
    /><path d="M18 22h12" ${s('faint')} />`,
  // accessory: amulet with gem
  accessory: `<circle cx="24" cy="18" r="9" ${s()}
    /><path d="M24 9v-4M20 27l-4 12 8-5 8 5-4-12" ${s()}
    /><path d="M24 14l3 4-3 4-3-4z" ${s('accent')} />`,
  // artwork: framed canvas with brush stroke
  artwork: `<rect x="9" y="9" width="30" height="30" rx="2" ${s()}
    /><path d="M15 30c4-8 8 2 12-6 3-5 6-3 7-1" ${s()}
    /><circle cx="17" cy="17" r="2.5" ${s('accent')} />`,
  // audio: waveform over a disc
  audio: `<circle cx="24" cy="24" r="15" ${s()}
    /><circle cx="24" cy="24" r="3" ${s('accent')}
    /><path d="M14 24h4M30 24h4M24 14v4M24 30v4" ${s('faint')}
    /><path d="M17 20c2 2 2 6 0 8M31 20c-2 2-2 6 0 8" ${s()} />`,
  // environment: layered horizon with sun
  environment: `<path d="M8 34l10-12 8 8 6-6 8 10" ${s()}
    /><circle cx="33" cy="15" r="5" ${s('accent')}
    /><path d="M8 38h32" ${s('faint')} />`,
};

/** dec: kind → inline SVG element at the requested pixel size. */
export function glyphFor(kind: AssetKind, size = 48): SVGSVGElement {
  return svg(GLYPHS[kind] ?? GLYPHS.artwork, size);
}
