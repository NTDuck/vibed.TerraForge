import { commit, getState } from '../app';
import { recordUsage, transferLicense } from '../store';
import { checkRights, USAGES, USAGE_LABEL, type Usage } from '../lib/license';
import { h, fmt, fmtDate, verifChip, onchainChip, notify, navTo } from '../ui';
import type { LicenseRights, LicenseNft, Sale, State, Tx } from '../types';

/** dec: rights matrix labels — short chips, key order fixed for stable UI. */
const RIGHTS_LABEL: Array<[keyof LicenseRights, string]> = [
  ['commercial', 'Commercial'],
  ['modification', 'Modify'],
  ['gameIntegration', 'Game use'],
  ['resale', 'Resale'],
];

const rightsMatrix = (rights: LicenseRights): HTMLElement =>
  h('div', { class: 'rights' },
    ...RIGHTS_LABEL.map(([key, label]) =>
      h('span', { class: `right ${rights[key] ? 'yes' : 'no'}` }, label)));

/** dec: verdict of the last on-chain permit() call for this license. Derived
 * from ledger txs so the chip survives re-render without extra ui state. */
const usageVerdict = (txs: Tx[], licenseId: string): HTMLElement | null => {
  const last = txs.find((t) => t.kind === 'usage' && t.call?.args[0] === licenseId);
  if (!last) return null;
  return h('span', { class: `chip ${last.status === 'reverted' ? 'chip-err' : 'chip-ok'}` },
    last.status === 'reverted' ? 'Not permitted' : 'Permitted');
};

const empty = (msg: string): HTMLElement => h('p', { class: 'muted sm' }, msg);

/** dec: my cut of a sale. Primary sales pay the creator split. Resales pay
 * the original creator a royalty split (kind creator/royalty per spec). */
const creatorCutOf = (s: State, sale: Sale): number | null => {
  const asset = s.assets.find((a) => a.id === sale.assetId);
  const mine = sale.sellerId == null
    ? asset?.creatorId === s.session
    : sale.splits.some((x) => x.to === s.session && x.kind === 'royalty');
  if (!mine) return null;
  const sp = sale.splits.find(
    (x) => x.to === s.session && (x.kind === 'creator' || x.kind === 'royalty'));
  return sp ? sp.vnd : null;
};

const licenseCard = (s: State, lic: LicenseNft): HTMLElement => {
  const asset = s.assets.find((a) => a.id === lic.assetId);
  const tier = asset?.tiers.find((t) => t.id === lic.tierId);
  if (!asset || !tier) return empty(`License ${lic.id} references a missing asset/tier.`);
  // dec: resale price input kept per-card via closure. Default is the tier list price.
  const priceInput = h('input', {
    class: 'field', type: 'number', min: 0, step: 1000, value: String(tier.priceVnd),
    'aria-label': 'Resale price (VND)',
  }) as HTMLInputElement;

  const doTransfer = (): void => {
    const price = Math.max(0, Math.floor(Number(priceInput.value) || 0));
    let err: string | undefined;
    commit((st) => {
      const r = transferLicense(st, lic.id, 'u-chi', price);
      err = r.error;
      return r.state;
    });
    if (err) notify('err', err);
    else notify('ok', 'License transferred to Chị Phạm — they are now the NFT owner.');
  };

  let usage: Usage = USAGES[0];
  const checkPermit = (): void => {
    const ok = checkRights(tier.rights, usage);
    commit((st) => recordUsage(st, lic.id, usage, ok));
    notify(ok ? 'ok' : 'err',
      `${USAGE_LABEL[usage]} — ${ok ? 'PERMITTED' : 'REVERTED'} by LicenseEnforcer.`);
  };

  const head = h('div', { class: 'row spread' },
    h('b', {}, asset.name),
    h('span', { class: 'chip' }, tier.name));

  const serialLine = h('div', { class: 'sm muted' },
    'Serial ', h('code', {}, `#${lic.serial}`), ' · tx ',
    h('code', {}, lic.txHash));

  const issued = h('div', { class: 'sm faint' }, `Issued ${fmtDate(lic.issuedAt)}`);

  const resale = tier.rights.resale
    ? h('div', {},
        h('h4', { class: 'sm' }, 'Resale'),
        h('div', { class: 'row' },
          priceInput,
          h('span', { class: 'faint sm' }, '₫'),
          h('button', { class: 'btn sm', onclick: doTransfer }, 'Transfer to Chị Phạm')),
        h('p', { class: 'sm faint' },
          'Demo transfer to the reviewer persona — 10% royalty routes back to the creator on-chain.'))
    : null;

  const usageBox = h('div', {},
    h('h4', { class: 'sm' }, 'Usage checker'),
    h('div', { class: 'row' },
      h('select', {
        class: 'field',
        onchange: (e: Event) => { usage = (e.target as HTMLSelectElement).value as Usage; },
      }, ...USAGES.map((u) => h('option', { value: u }, USAGE_LABEL[u]))),
      h('button', { class: 'btn ghost sm', onclick: checkPermit }, 'Check permit'),
      usageVerdict(s.txs, lic.id)));

  return h('div', { class: 'card' }, head, serialLine, issued, rightsMatrix(tier.rights), resale, usageBox);
};

const saleRow = (s: State, sale: Sale, cut: number): HTMLElement => {
  const asset = s.assets.find((a) => a.id === sale.assetId);
  return h('tr', {},
    h('td', {}, asset?.name ?? sale.assetId),
    h('td', {}, s.users[sale.buyerId]?.name ?? sale.buyerId),
    h('td', { class: 'faint sm' }, fmtDate(sale.ts)),
    h('td', { class: 'mono', style: 'text-align:right' }, fmt(sale.grossVnd)),
    h('td', { class: 'mono', style: 'text-align:right' }, fmt(cut)));
};

function royaltiesCard(s: State): HTMLElement {
  const rows = s.sales
    .map((sale) => ({ sale, cut: creatorCutOf(s, sale) }))
    .filter((r): r is { sale: Sale; cut: number } => r.cut != null);
  if (rows.length === 0) return empty('No sales yet — list an asset on the Market and royalties will land here.');
  const lifetime = rows.reduce((sum, r) => sum + r.cut, 0);

  const table = h('table', { class: 'ledger' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Sale'), h('th', {}, 'Buyer'), h('th', {}, 'When'),
      h('th', { style: 'text-align:right' }, 'Gross'),
      h('th', { style: 'text-align:right' }, 'My cut'))),
    h('tbody', {}, ...rows.map((r) => saleRow(s, r.sale, r.cut))));

  const totals = h('div', { class: 'row spread', style: 'margin-top:10px' },
    h('b', {}, 'Lifetime earnings'),
    h('b', { class: 'mono' }, fmt(lifetime)));

  return h('div', { class: 'card' }, table, totals);
}

function myAssetsCard(s: State): HTMLElement {
  const mine = s.assets.filter((a) => a.creatorId === s.session);
  if (mine.length === 0) return empty('No assets uploaded yet — use the Upload tab.');
  const row = (a: State['assets'][number]): HTMLElement =>
    h('div', { class: 'row spread' },
      h('b', { class: 'sm' }, a.name),
      h('div', { class: 'row' },
        verifChip(a.verification.status),
        h('span', { class: `chip ${a.listed ? 'chip-ok' : 'chip-off'}` }, a.listed ? 'Listed' : 'Unlisted'),
        a.tokenId
          ? h('span', { class: 'chip chip-chain' }, `Minted · ${a.tokenId}`)
          : h('span', { class: 'chip chip-off' }, 'Not minted')));
  return h('div', { class: 'card' }, ...mine.map(row));
}

function creatorSection(s: State): HTMLElement {
  return h('div', {},
    h('h2', {}, 'Royalties'),
    royaltiesCard(s),
    h('h2', {}, 'My assets'),
    myAssetsCard(s));
}

function reviewerSection(s: State): HTMLElement {
  const queue = s.assets.filter((a) => a.verification.status === 'needs-review');
  return h('div', {},
    h('h2', {}, 'Review queue'),
    h('div', { class: 'card row spread' },
      h('div', {},
        h('b', {}, 'Cultural review'),
        h('p', { class: 'sm muted' }, 'Assets flagged by the AI scanner wait for your verdict.')),
      h('div', { class: 'row' },
        h('span', { class: `chip ${queue.length > 0 ? 'chip-warn' : 'chip-ok'}` },
          `${queue.length} needs review`),
        h('button', { class: 'btn sm', onclick: () => navTo('review') }, 'Go to Review tab'))));
}

function buyerSection(s: State): HTMLElement {
  const mine = s.licenses.filter((l) => l.ownerId === s.session);
  return h('div', {},
    h('h2', {}, 'My licenses'),
    h('div', { class: 'banner sm' },
      'Testing the revert path? The declined-payment simulation lives on the asset purchase panel (Market → an asset).'),
    mine.length === 0
      ? empty('No licenses yet — buy one from the Market.')
      : h('div', { class: 'grid assets' }, ...mine.map((l) => licenseCard(s, l))));
}

function recentActivity(s: State): HTMLElement {
  if (s.txs.length === 0) return empty('Nothing on the ledger yet — your calls will appear here.');
  const row = (t: Tx): HTMLElement =>
    h('div', { class: 'row spread' },
      h('div', {},
        h('b', { class: 'sm' }, t.label),
        h('div', { class: 'sm faint' }, fmtDate(t.ts))),
      h('div', { class: 'row' },
        onchainChip(t.onChain),
        t.status === 'reverted' ? h('span', { class: 'chip chip-err' }, 'reverted') : null));
  return h('div', {},
    h('h2', {}, 'Recent activity'),
    h('div', { class: 'card' }, ...s.txs.slice(0, 6).map(row)));
}

export function renderDashboard(): HTMLElement {
  const s = getState();

  if (!s.session) {
    return h('section', { class: 'wrap' },
      h('h1', {}, 'Dashboard'),
      h('div', { class: 'banner' },
        h('b', {}, 'No session.'),
        ' Use Sign in top-right to pick a demo persona and see your licenses, royalties or review queue here.'));
  }

  const me = s.users[s.session];
  const roleSection =
    me.role === 'buyer' ? buyerSection(s)
    : me.role === 'creator' ? creatorSection(s)
    : me.role === 'reviewer' ? reviewerSection(s)
    : empty('This demo has no dashboard for the platform role.');

  return h('section', { class: 'wrap' },
    h('h1', {}, 'Dashboard'),
    h('p', { class: 'muted' }, `Signed in as ${me.name} (${me.role}).`),
    roleSection,
    recentActivity(s));
}
