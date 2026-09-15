import { commit, getState } from '../app';
import { startPurchase, setPurchaseStep, toggleLedger } from '../store';
import { runPurchase } from '../flow';
import { CONFIG } from '../config';
import { gallery } from '../lib/compat-ui';
import { h, fmt, fmtDate, verifChip, navTo } from '../ui';
import type { Asset, LicenseTier, PurchaseState, Split } from '../types';

/** dec: step indicator order mirrors runPurchase's state machine. */
const STEP_NAMES: Array<PurchaseState['step']> = ['summary', 'paying', 'verifying', 'issuing', 'done'];

function stepsIndicator(purchase: PurchaseState): HTMLElement {
  const idx = STEP_NAMES.indexOf(purchase.step);
  return h('div', { class: 'steps' },
    STEP_NAMES.slice(0, -1).map((name, i) =>
      h('span', { class: `step${purchase.step === name ? ' now' : idx > i ? ' done' : ''}`, 'data-n': String(i + 1) }, name)),
  );
}

function rightsTable(tier: LicenseTier): HTMLElement {
  const r = tier.rights;
  return h('table', { class: 'ledger' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Licence type'),
      h('th', {}, 'Price'),
      h('th', {}, 'Commercial'),
      h('th', {}, 'Modify'),
      h('th', {}, 'Redistribute'),
      h('th', {}, 'Secondary sale'))),
    h('tbody', {}, h('tr', {},
      h('td', {}, tier.name),
      h('td', { class: 'amount' }, fmt(tier.priceVnd)),
      h('td', {}, r.commercial ? 'Yes' : 'No'),
      h('td', {}, r.modification ? 'Yes' : 'No'),
      h('td', {}, r.gameIntegration ? 'Yes' : 'No'),
      h('td', {}, r.resale ? 'Allowed + 10% royalty' : 'Not allowed'))),
  );
}

/** dec: accordion section. Open/closed lives in the DOM, not in store state. */
function accBlock(title: string, open: boolean, body: HTMLElement, badge?: HTMLElement): HTMLElement {
  const head = h('button', { class: 'acc-head', type: 'button' },
    h('span', { class: 'row', style: 'gap: var(--space-2)' }, h('h3', {}, title), badge ?? null),
    h('span', { class: 'muted', 'aria-hidden': 'true' }, '▾'));
  const el = h('div', { class: `acc${open ? ' open' : ''}` }, head, h('div', { class: 'acc-body' }, body));
  head.addEventListener('click', () => el.classList.toggle('open'));
  return el;
}

const compatChip = (asset: Asset): HTMLElement => {
  const st = asset.verification.compat?.status;
  if (st === 'verified') return h('span', { class: 'chip chip-ok' }, 'Compatibility verified');
  if (st === 'needs-review') return h('span', { class: 'chip chip-warn' }, 'Compatibility needs review');
  return h('span', { class: 'chip chip-off' }, 'Compatibility pending');
};

/** dec: four collapsible blocks mirror the docx layout: overview, spec, rights, chain record. */
function detailBlocks(asset: Asset, creatorName: string): HTMLElement[] {
  const v = asset.verification;

  const overview = h('dl', { class: 'kv' },
    h('dt', {}, 'Asset name'), h('dd', {}, asset.name),
    h('dt', {}, 'Description'), h('dd', {}, asset.blurb),
    h('dt', {}, 'Creator'), h('dd', {}, creatorName),
    h('dt', {}, 'Creator profile'), h('dd', {}, 'Independent environment studio'),
    h('dt', {}, 'Asset category'), h('dd', {}, 'AI-assisted cultural environment kit'),
    h('dt', {}, 'Use case'), h('dd', {}, 'Game environments, level dressing, cinematics'),
    h('dt', {}, 'Verification status'),
    h('dd', { class: 'row' }, verifChip(v.status), compatChip(asset)),
  );

  const spec = asset.spec;
  const tech = h('dl', { class: 'kv' },
    h('dt', {}, 'Asset type'), h('dd', {}, 'Environment kit'),
    h('dt', {}, 'File format'), h('dd', {}, spec?.format ?? 'Not declared'),
    h('dt', {}, 'Polygon count'),
    h('dd', {}, spec ? `${spec.tris.toLocaleString('en-US')} tris` : 'Not declared'),
    h('dt', {}, 'Texture'), h('dd', {}, spec?.texture ?? 'Not declared'),
    h('dt', {}, 'Animations'),
    h('dd', {}, spec ? `${spec.animations} included` : 'Not declared'),
    h('dt', {}, 'Engine compatibility'),
    h('dd', {}, asset.passport.platforms.length
      ? asset.passport.platforms.join(', ')
      : 'Not declared'),
  );

  const rights = h('div', { class: 'flow' },
    asset.tiers.map((t) => rightsTable(t)),
    h('p', { class: 'sm muted' }, 'Licence scope: commercial game development · Duration: perpetual'),
  );

  const cred = asset.credential;
  const chain = cred
    ? h('dl', { class: 'kv' },
        h('dt', {}, 'Credential ID'), h('dd', {}, cred.id),
        h('dt', {}, 'Token standard'), h('dd', {}, 'ERC-721 (non-transferable)'),
        h('dt', {}, 'Network'), h('dd', {}, CONFIG.chain.network),
        h('dt', {}, 'Smart contract address'),
        h('dd', {}, h('button', {
          class: 'addr', type: 'button', onclick: () => commit(toggleLedger),
        }, cred.contractAddress)),
        h('dt', {}, 'Token ID'), h('dd', {}, cred.tokenId),
        h('dt', {}, 'Issuer'), h('dd', {}, cred.issuer),
        h('dt', {}, 'Holder wallet'), h('dd', {}, cred.holder),
        h('dt', {}, 'Credential type'), h('dd', {}, cred.type),
        h('dt', {}, 'Issue date'), h('dd', {}, cred.issueDate),
        h('dt', {}, 'Status'), h('dd', {}, h('span', { class: 'chip chip-ok' }, 'Active ✓')),
        h('dt', {}, 'Transferability'), h('dd', {}, 'Disabled ✓'),
        h('dt', {}, 'Verification record'), h('dd', {}, 'Verified ✓'),
        h('dt', {}, 'Transaction hash'),
        h('dd', {}, h('button', {
          class: 'addr', type: 'button', onclick: () => commit(toggleLedger),
        }, cred.txHash)),
      )
    : h('p', { class: 'muted sm' }, 'No credential yet — complete dual verification and mint.');

  return [
    accBlock('Overview', true, overview, h('span', { class: 'badge' }, asset.kind)),
    accBlock('Technical Specification', false, tech),
    accBlock('Rights & Licensing', false, rights),
    accBlock('Blockchain / Settlement Record', false, chain),
  ];
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
      h('strong', {}, 'License issued'),
      lic
        ? h('p', { class: 'sm' }, 'Serial ', h('code', {}, `#${lic.serial}`), ' · tx ', h('code', {}, lic.txHash), ' · ', fmtDate(lic.issuedAt))
        : h('p', { class: 'sm faint' }, 'License record not found.'),
      table ?? h('p', { class: 'sm faint' }, 'No split record.'),
      h('div', { class: 'row', style: 'margin-top: var(--space-3)' },
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
    h('div', { class: 'row', style: 'margin-top: var(--space-3)' },
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

/** dec: per-tier rights chips for the tier card. */
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

function tierCard(asset: Asset, tier: LicenseTier): HTMLElement {
  const s = getState();
  const buy = () => {
    commit((st) => startPurchase(st, asset.id, tier.id));
    navTo('asset', asset.id); // dec: re-render so the purchase panel replaces the tier list
  };
  return h('div', { class: 'card flow' },
    h('div', { class: 'row spread' },
      h('h3', {}, tier.name),
      h('strong', { class: 'mono' }, fmt(tier.priceVnd)),
    ),
    h('p', { class: 'sm muted' }, `${tier.seats} seat${tier.seats === 1 ? '' : 's'}`),
    rightsRow(tier.rights),
    s.session
      ? h('button', { class: 'btn accent', onclick: buy }, 'Buy license')
      : h('p', { class: 'banner warn sm' },
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
        h('button', { class: 'btn sm ghost', onclick: () => navTo('market') }, '← Market')),
    );
  }

  const creator = s.users[asset.creatorId];
  const minted = asset.tokenId != null;
  const purchaseActive = s.purchase?.assetId === asset.id;
  const activeTier = purchaseActive ? asset.tiers.find((t) => t.id === s.purchase!.tierId) : undefined;

  // dec: gallery card on top, then the four collapsible blocks below it.
  const left = h('div', { class: 'flow' },
    h('div', { class: 'card' },
      gallery(asset.images, asset.kind, 420),
      h('h1', {}, asset.name),
    ),
    h('div', { class: 'tbl-blocks' }, detailBlocks(asset, creator?.name ?? asset.creatorId)),
  );

  // dec: right column stacks mint status and each tier as its own card
  const tierBlocks = asset.tiers.map((t) => tierCard(asset, t));
  const right = h('div', { class: 'flow' },
    h('div', { class: 'card' },
      h('h3', {}, 'Mint status'),
      minted
        ? h('p', { class: 'sm' }, 'Token ', h('code', {}, asset.tokenId!), ' · tx ', h('code', {}, asset.mintTx ?? '—'))
        : h('p', { class: 'faint sm' }, 'not minted'),
    ),
    h('h2', {}, 'License tiers'),
    purchaseActive
      ? (activeTier ? purchasePanel(asset, activeTier) : h('div', { class: 'banner err' }, 'Purchase tier missing.'))
      : tierBlocks.length
        ? tierBlocks
        : h('p', { class: 'faint' }, 'No tiers configured for this asset yet.'),
  );

  return h('section', { class: 'wrap' },
    h('p', {},
      h('a', { class: 'btn ghost sm', href: '#/market', onclick: (e: MouseEvent) => { e.preventDefault(); navTo('market'); } }, '← Market')),
    h('div', { class: 'grid two' }, left, right),
  );
}
