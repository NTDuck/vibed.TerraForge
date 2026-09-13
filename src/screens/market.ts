import { getState } from '../app';
import { glyphFor } from '../lib/glyph';
import { h, fmt, verifChip, navTo } from '../ui';
import type { Asset } from '../types';

const ASSET_KINDS: Array<[string, string]> = [
  ['character', 'Characters'],
  ['skin', 'Skins'],
  ['accessory', 'Accessories'],
  ['artwork', 'Artwork'],
  ['audio', 'Audio'],
  ['environment', 'Environments'],
];

/** dec: filter state is local to the screen — the store stays pure domain state. */
let kindFilter = 'all';
let query = '';

const cheapestTier = (a: Asset): number =>
  a.tiers.length ? Math.min(...a.tiers.map((t) => t.priceVnd)) : 0;

function assetCard(a: Asset): HTMLElement {
  const creator = getState().users[a.creatorId];
  return h(
    'div',
    {
      class: 'card click',
      onclick: () => navTo('asset', a.id),
      role: 'button',
      tabindex: '0',
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navTo('asset', a.id);
        }
      },
    },
    h('div', { class: 'preview' }, glyphFor(a.kind, 56)),
    h('h3', {}, a.name),
    h('div', { class: 'row sm muted' }, creator?.name ?? a.creatorId),
    h('div', { class: 'row', style: 'margin-top:8px' },
      h('span', { class: 'chip' }, a.kind),
      verifChip(a.verification.status),
    ),
    h('div', { class: 'row spread', style: 'margin-top:8px' },
      h('span', { class: 'sm' }, a.tiers.length ? fmt(cheapestTier(a)) : h('span', { class: 'faint' }, 'no tiers')),
      a.passport.platforms.length
        ? h('span', { class: 'chip' }, `${a.passport.platforms.length} platforms`)
        : h('span', { class: 'chip chip-off' }, 'no passport'),
    ),
  );
}

function renderGrid(): HTMLElement {
  const s = getState();
  const q = query.trim().toLowerCase();
  const listed = s.assets.filter(
    (a) =>
      a.listed &&
      (kindFilter === 'all' || a.kind === kindFilter) &&
      (!q || a.name.toLowerCase().includes(q) || a.blurb.toLowerCase().includes(q)),
  );
  if (!listed.length) {
    return h('div', { class: 'banner' },
      h('p', { class: 'muted' }, 'No listed assets match this filter. Try clearing the search or picking another kind.'));
  }
  return h('div', { class: 'grid assets' }, listed.map(assetCard));
}

export function renderMarket(): HTMLElement {
  const gridHost = h('div', {}, renderGrid());

  const kindSel = h(
    'select',
    {
      onchange: (e: Event) => {
        kindFilter = (e.target as HTMLSelectElement).value;
        gridHost.replaceChildren(renderGrid());
      },
    },
    h('option', { value: 'all' }, 'All kinds'),
    ASSET_KINDS.map(([v, label]) => h('option', { value: v, selected: kindFilter === v }, label)),
  );

  const search = h('input', {
    type: 'search',
    placeholder: 'Search name or blurb…',
    value: query,
    oninput: (e: Event) => {
      query = (e.target as HTMLInputElement).value;
      gridHost.replaceChildren(renderGrid());
    },
  });

  return h('section', { class: 'wrap' },
    h('h1', {}, 'AI Game Asset Market'),
    h('p', { class: 'muted' }, 'Licensed AI-generated game assets with on-chain provenance and VND fiat checkout.'),
    h('div', { class: 'row', style: 'margin-bottom:16px' },
      h('span', { class: 'chip chip-chain' }, '⛓ SenChain Testnet'),
      h('span', { class: 'chip' }, 'VND fiat checkout'),
      h('span', { class: 'chip chip-ok' }, 'AI provenance'),
    ),
    h('div', { class: 'row', style: 'margin-bottom:14px' },
      h('div', { class: 'field grow' }, h('label', {}, 'Kind'), kindSel),
      h('div', { class: 'field grow' }, h('label', {}, 'Search'), search),
    ),
    gridHost,
  );
}
