import { h } from '../ui';
import type { AssetKind, CompatCriterion, CompatRun } from '../types';
import { glyphFor } from './glyph';
/** dec: DOM helpers for the compatibility layer. Screens compose these with h(). */

const ICO: Record<'pass' | 'fail', string> = { pass: '✓', fail: '✕' };

/** One criterion row. state picks the .crit.<state> class and the glyph. */
export function compatRow(c: CompatCriterion, state: 'pass' | 'fail'): HTMLElement {
  return h('div', { class: `crit ${state}` },
    h('span', { class: 'ico', 'aria-hidden': 'true' }, ICO[state]),
    h('span', { class: 'crit-name' }, c.name),
    h('span', { class: 'crit-detail' }, c.detail),
  );
}

/**
 * Gallery with main image + thumbs + prev/next nav.
 * Falls back to the kind glyph when no image is set. Index state is closure-local.
 */
export function gallery(
  images: { display: string; gallery: string[] } | undefined,
  kind: AssetKind,
  size = 48,
): HTMLElement {
  let idx = 0;
  const srcs = images ? [images.display, ...images.gallery] : [];

  const main = srcs.length
    ? (h('img', { class: 'gal-main', src: srcs[0], alt: '' }) as HTMLImageElement)
    : h('div', { class: 'gal-main gal-fallback' }, glyphFor(kind, size));

  const thumbs = srcs.map((src, i) =>
    h('button', {
      class: `gal-thumb${i === idx ? ' on' : ''}`,
      type: 'button',
      'aria-label': `Image ${i + 1} of ${srcs.length}`,
      onclick: () => {
        idx = i;
        if (main instanceof HTMLImageElement) main.src = srcs[idx];
        thumbs.forEach((t, j) => t.classList.toggle('on', j === idx));
      },
    }, h('img', { src, alt: '' })),
  );

  const move = (delta: number): void => {
    if (!srcs.length) return;
    idx = (idx + delta + srcs.length) % srcs.length;
    if (main instanceof HTMLImageElement) main.src = srcs[idx];
    thumbs.forEach((t, j) => t.classList.toggle('on', j === idx));
  };

  const nav = srcs.length > 1
    ? h('div', { class: 'gal-nav' },
        h('button', { class: 'btn sm ghost', type: 'button', 'aria-label': 'Previous image', onclick: () => move(-1) }, '‹'),
        h('button', { class: 'btn sm ghost', type: 'button', 'aria-label': 'Next image', onclick: () => move(1) }, '›'),
      )
    : null;

  return h('div', { class: 'gal' }, main, thumbs.length ? h('div', { class: 'gal-thumbs' }, thumbs) : null, nav);
}

/** dec: per-platform findings for a finished run. Null until results exist. */
export const compatFindings = (run: CompatRun | undefined): HTMLElement | null => {
  if (!run || run.status === 'pending' || run.status === 'running') return null;
  const rows: unknown[] = [];
  for (const p of run.platforms) {
    rows.push(h('h4', { style: 'margin-bottom: var(--space-1)' }, p));
    rows.push(...(run.results[p] ?? []).map((c) => compatRow(c, c.pass ? 'pass' : 'fail')));
  }
  const allPass = run.platforms.every((p) => (run.results[p] ?? []).every((c) => c.pass));
  rows.push(h('div', { class: 'row' }, allPass
    ? h('span', { class: 'chip chip-ok' }, 'Compatibility Verified')
    : h('span', { class: 'chip chip-warn' }, 'Needs Review - routed to human reviewer')));
  return h('div', { class: 'flow' }, ...rows);
};

/** dec: one-line run status chip for badges and headers. */
export const compatChip = (run: CompatRun | undefined): HTMLElement => {
  if (run?.status === 'verified') return h('span', { class: 'chip chip-ok' }, 'Compatibility verified');
  if (run?.status === 'needs-review') return h('span', { class: 'chip chip-warn' }, 'Compatibility needs review');
  return h('span', { class: 'chip chip-off' }, 'Compatibility pending');
};
