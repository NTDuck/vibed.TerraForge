import { commit, getState } from '../app';
import { glyphFor } from '../lib/glyph';
import { startPurchase, setPurchaseStep } from '../store';
import { runPurchase } from '../flow';
import { CONFIG } from '../config';
import { h, fmt, fmtDate, verifChip, navTo } from '../ui';
import type { Asset, LicenseTier, PurchaseState, Split } from '../types';

/** dec: step indicator order mirrors runPurchase's state machine. */
const STEP_NAMES: Array<PurchaseState['step']> = ['summary', 'paying', 'verifying', 'issuing', 'done'];

function stepsIndicator(purchase: PurchaseState): HTMLElement {
  const idx = STEP_NAMES.indexOf(purchase.step);
  return h('div', { class: 'steps' },
    STEP_NAMES.slice(0, -1).map((name, i) =>
      h('span', { class: `step${purchase.step === name ? ' now' : idx > i ? ' done' : ''}` }, name)),
  );
}

function rightsRow(rights: LicenseTier['rights']): HTMLElement {
  const cell = (label: string, on: boolean) =>
    h('span', { class: `right ${on ? 'yes' : 'no'}` }, label);
  return h('div', { class: 'rights' },
    cell('Commercial', rights.commercial),
    cell('Modify', rights.modification),
    cell('Game integration', rights.gameIntegration),
    cell('Resale', rights.resale),
  );
}

/** dec: splits table prefers the live purchase splits, falls back to the last sale of this asset. */
function splitsTable(purchase: PurchaseState, assetId: string): HTMLElement | null {
  const s = getState();
  const splits: Split[] | undefined =
    purchase.splits ?? s.sales.filter((sa) => sa.assetId === assetId).at(-1)?.splits;
  if (!splits?.length) return null;
  return h('table', { class: 'ledger' },
    h('thead', {}, h('tr', {}, h('th', {}, 'To'), h('th', {}, 'Kind'), h('th', {}, 'VND'))),
    h('tbody', {}, splits.map((sp) =>
      h('tr', {},
        h('td', {}, s.users[sp.to]?.name ?? sp.to),
        h('td', {}, sp.kind),
        h('td', { class: 'amount' }, fmt(sp.vnd)),
      ))),
  );
}

function purchasePanel(asset: Asset, tier: LicenseTier): HTMLElement {
  const s = getState();
  const p = s.purchase;
  if (!p) return h('div', {});

  if (p.step === 'failed') {
    return h('div', { class: 'banner err' },
      h('strong', {}, 'Purchase failed'),
      h('p', { class: 'sm' }, p.error ?? 'Unknown error.'),
      h('button', { class: 'btn sm', onclick: () => commit((st) => ({ ...st, purchase: null })) }, 'Retry'));
  }

  if (p.step === 'done') {
    const lic = s.licenses.find((l) => l.id === p.licenseId);
    const table = splitsTable(p, asset.id);
    return h('div', { class: 'banner' },
      h('strong', {}, 'License issued 🎉'),
      lic
        ? h('p', { class: 'sm' }, 'Serial ', h('code', {}, `#${lic.serial}`), ' · tx ', h('code', {}, lic.txHash), ' · ', fmtDate(lic.issuedAt))
        : h('p', { class: 'sm faint' }, 'License record not found.'),
      table ?? h('p', { class: 'sm faint' }, 'No split record.'),
      h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { class: 'btn sm accent', onclick: () => navTo('dashboard') }, 'View in dashboard'),
        h('button', { class: 'btn sm ghost', onclick: () => commit((st) => ({ ...st, purchase: null })) }, 'Close'),
      ));
  }

  // summary / paying / verifying / issuing: payment form + live step indicator
  let method = p.method ?? CONFIG.fiatMethods[0];
  let fail = p.failPayment;
  const methodSel = h('select', { disabled: p.step !== 'summary' },
    CONFIG.fiatMethods.map((m) => h('option', { value: m, selected: m === method }, m)));
  methodSel.addEventListener('change', () => {
    method = (methodSel as HTMLSelectElement).value;
  });
  const failBox = h('input', {
    type: 'checkbox',
    checked: fail,
    disabled: p.step !== 'summary',
    onchange: (e: Event) => { fail = (e.target as HTMLInputElement).checked; },
  });

  return h('div', { class: 'card' },
    h('h3', {}, 'Checkout — ', tier.name),
    stepsIndicator(p),
    h('div', { class: 'kv' },
      h('dt', {}, 'Tier'), h('dd', {}, tier.name),
      h('dt', {}, 'Price'), h('dd', {}, fmt(tier.priceVnd)),
      h('dt', {}, 'Seats'), h('dd', {}, String(tier.seats)),
    ),
    h('div', { class: 'field' }, h('label', {}, 'Fiat method'), methodSel),
    h('label', { class: 'row sm' }, failBox, 'Simulate declined payment'),
    h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', {
        class: 'btn accent',
        disabled: p.step !== 'summary',
        onclick: () => {
          commit((st) => setPurchaseStep(st, 'summary', { method, failPayment: fail }));
          void runPurchase(asset.id, tier.id, method, fail);
        },
      }, 'Confirm payment'),
      h('button', {
        class: 'btn ghost',
        onclick: () => commit((st) => ({ ...st, purchase: null })),
      }, 'Cancel'),
    ),
  );
}

function tierCard(asset: Asset, tier: LicenseTier): HTMLElement {
  const s = getState();
  const buy = () => {
    commit((st) => startPurchase(st, asset.id, tier.id));
    navTo('asset', asset.id); // dec: re-render so the purchase panel replaces the tier list
  };
  return h('div', { class: 'card' },
    h('div', { class: 'row spread' },
      h('h3', {}, tier.name),
      h('strong', {}, fmt(tier.priceVnd)),
    ),
    h('p', { class: 'sm muted' }, `${tier.seats} seat${tier.seats === 1 ? '' : 's'}`),
    rightsRow(tier.rights),
    s.session
      ? h('button', { class: 'btn accent', style: 'margin-top:10px', onclick: buy }, 'Buy license')
      : h('p', { class: 'banner warn sm', style: 'margin-top:10px' },
          'Sign in as a buyer to purchase (use the wallet button in the top bar).'),
  );
}

export function renderAsset(id: string): HTMLElement {
  const s = getState();
  const asset = s.assets.find((a) => a.id === id);
  if (!asset) {
    return h('section', { class: 'wrap' },
      h('div', { class: 'banner err' }, 'Asset not found'),
      h('p', {},
        h('button', { class: 'btn sm', onclick: () => navTo('market') }, '← Back to market')),
    );
  }

  const creator = s.users[asset.creatorId];
  const v = asset.verification;
  const minted = asset.tokenId != null;
  const purchaseActive = s.purchase?.assetId === asset.id;
  const activeTier = purchaseActive ? asset.tiers.find((t) => t.id === s.purchase!.tierId) : undefined;

  const left = h('div', { class: 'card' },
    h('div', { class: 'preview' }, glyphFor(asset.kind, 96)),
    h('h1', {}, asset.name),
    h('p', { class: 'muted' }, asset.blurb),
    h('p', { class: 'sm' }, 'Creator: ', h('strong', {}, creator?.name ?? asset.creatorId)),
    h('p', { class: 'sm' }, 'Model: ', h('code', {}, asset.model)),
    h('div', { class: 'card', style: 'margin-top:12px' },
      h('h3', {}, 'AI Provenance ', h('span', { class: 'faint sm' }, v.model)),
      h('div', { class: 'row' }, verifChip(v.status)),
      v.reasons?.length
        ? h('ul', { class: 'sm muted' }, v.reasons.map((r) => h('li', {}, r)))
        : null,
      h('div', { class: 'kv sm' },
        h('dt', {}, 'Similarity'), h('dd', {}, `${v.similarity.toFixed(1)}%`),
        h('dt', {}, 'Traceability'), h('dd', {}, `${v.traceability.toFixed(0)}%`),
      ),
    ),
    h('div', { class: 'card', style: 'margin-top:12px' },
      h('h3', {}, 'Compatibility passport'),
      asset.passport.platforms.length || asset.passport.formats.length
        ? h('div', { class: 'row' },
            asset.passport.platforms.map((p) => h('span', { class: 'chip chip-chain' }, p)),
            asset.passport.formats.map((f) => h('span', { class: 'chip' }, f)))
        : h('p', { class: 'muted sm' }, 'passport not declared yet'),
    ),
  );

  const right = h('div', { class: 'card' },
    h('h3', {}, 'Mint status'),
    minted
      ? h('p', { class: 'sm' }, 'Token ', h('code', {}, asset.tokenId!), ' · tx ', h('code', {}, asset.mintTx ?? '—'))
      : h('p', { class: 'faint sm' }, 'not minted'),
    h('h2', {}, 'License tiers'),
    purchaseActive
      ? (activeTier ? purchasePanel(asset, activeTier) : h('div', { class: 'banner err' }, 'Purchase tier missing.'))
      : asset.tiers.length
        ? asset.tiers.map((t) => tierCard(asset, t))
        : h('p', { class: 'faint' }, 'No tiers configured for this asset yet.'),
  );

  return h('section', { class: 'wrap' },
    h('p', {},
      h('a', { href: '#/market', onclick: (e: MouseEvent) => { e.preventDefault(); navTo('market'); } }, '← Back to market')),
    h('div', { class: 'grid two' }, left, right),
  );
}
