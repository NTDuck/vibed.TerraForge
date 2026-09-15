import { getState } from '../app';
import { gallery } from '../lib/compat-ui';
import { h, fmt, verifChip, navTo } from '../ui';
import type { Asset } from '../types';
let query = '';

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
    h('div', { class: 'preview' }, gallery(a.images, a.kind, 56)),
    h('h3', {}, a.name),
    // dec: price+creator lead the card. Meta chips sit below as secondary info.
    h('div', { class: 'row spread', style: 'margin-top: var(--space-2)' },
      a.tiers.length
        ? h('strong', { class: 'mono', style: 'color: var(--accent)' }, fmt(Math.min(...a.tiers.map((t) => t.priceVnd))))
        : h('span', { class: 'faint mono' }, 'no tiers'),
      h('span', { class: 'sm muted' }, creator?.name ?? a.creatorId),
    ),
    h('div', { class: 'row sm', style: 'margin-top: var(--space-2)' },
      h('span', { class: 'chip' }, a.kind),
      verifChip(a.verification.status),
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
      (!q || a.name.toLowerCase().includes(q) || a.blurb.toLowerCase().includes(q)),
  );
  if (!listed.length) {
    return h('div', { class: 'banner warn' }, 'No assets match this filter.');
  }
  return h('div', { class: 'grid assets' }, listed.map(assetCard));
}

export function renderMarket(): HTMLElement {
  const gridHost = h('div', {}, renderGrid());

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
    // dec: two-row head — h1 + one-line sub, then chip row. No hero plate.
    h('h1', {}, 'TerraForge market'),
    h('p', { class: 'muted' }, 'Polygon-anchored environment kits with dual verification and VND checkout.'),
    h('div', { class: 'row', style: 'margin-bottom: var(--space-4)' },
      h('span', { class: 'chip chip-chain' }, '⛓ Polygon'),
      h('span', { class: 'chip' }, 'VND fiat'),
      h('span', { class: 'chip chip-ok' }, 'Dual verification (AI + compat)'),
    ),
    h('div', { class: 'row spread', style: 'margin-bottom: var(--space-4)' },
      h('div', { class: 'field', style: 'min-width: 260px; flex: 0 1 340px' }, h('label', {}, 'Search'), search),
    ),
    gridHost,
  );
}
