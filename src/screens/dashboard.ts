import { commit, getState } from '../app';
import { recordUsage, transferLicense } from '../store';
import { RESELLER } from '../seed';
import { checkRights, USAGES, USAGE_LABEL, type Usage } from '../lib/license';
import { h, fmt, fmtDate, ledgerTable, mintChip, rightsRow, verifChip, onchainChip, notify, navTo } from '../ui';
import type { LicenseNft, Sale, State, Tx } from '../types';

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
    type: 'number', min: 0, step: 1000, value: String(tier.priceVnd),
    'aria-label': 'Resale price (VND)',
  }) as HTMLInputElement;

  // dec: transfer target — every user except the owner. Treasury excluded.
  // Defaults to Minh Vũ (buyer 2) so the buyer1 → buyer2 story is one click.
  const targets = Object.values(s.users).filter(
    (u) => u.id !== lic.ownerId && u.role !== 'platform');
  let targetId = targets.some((u) => u.id === RESELLER) ? RESELLER : targets[0].id;
  const targetName = (): string => s.users[targetId]?.name ?? targetId;
  const targetSelect = h('select', {
    'aria-label': 'Transfer license to',
    onchange: (e: Event) => {
      targetId = (e.target as HTMLSelectElement).value;
      transferBtn.textContent = `Transfer to ${targetName()}`;
    },
  }, ...targets.map((u) =>
    h('option', { value: u.id, selected: u.id === targetId }, `${u.name} — ${u.role}`)));

  const doTransfer = (): void => {
    const price = Math.max(0, Math.floor(Number(priceInput.value) || 0));
    let err: string | undefined;
    commit((st) => {
      const r = transferLicense(st, lic.id, targetId, price);
      err = r.error;
      return r.state;
    });
    if (err) notify('err', err);
    else notify('ok', `License transferred to ${targetName()} — they are now the NFT owner.`);
  };
  const transferBtn = h('button', { class: 'btn sm', onclick: doTransfer },
    `Transfer to ${targetName()}`);

  let usage: Usage = USAGES[0];
  const checkPermit = (): void => {
    const ok = checkRights(tier.rights, usage);
    commit((st) => recordUsage(st, lic.id, usage, ok));
    notify(ok ? 'ok' : 'err',
      `${USAGE_LABEL[usage]} — ${ok ? 'PERMITTED' : 'REVERTED'} by LicenseEnforcer.`);
  };

  const head = h('div', { class: 'row spread' },
    h('h3', { class: 'grow' }, asset.name),
    h('span', { class: 'chip' }, tier.name));

  // dec: kv dl — dt faint, dd mono per .kv. Serial/tx/issued share one panel.
  const serialLine = h('dl', { class: 'kv' },
    h('dt', {}, 'Serial'), h('dd', {}, `#${lic.serial}`),
    h('dt', {}, 'Tx'), h('dd', {}, lic.txHash),
    h('dt', {}, 'Issued'), h('dd', {}, fmtDate(lic.issuedAt)));

  const resale = tier.rights.resale
    ? h('div', {},
        h('div', { class: 'field' },
          h('label', {}, 'Resale price'),
          h('div', { class: 'row' },
            priceInput,
            targetSelect,
            transferBtn)),
        h('p', { class: 'sm faint' },
          'On-chain transfer via LicenseEnforcer.resale — 10% royalty routes back to the creator.'))
    : null;

  const usageBox = h('div', {},
    h('div', { class: 'field' },
      h('label', {}, 'Usage checker'),
      h('div', { class: 'row' },
        h('select', {
          'aria-label': 'Usage to check',
          onchange: (e: Event) => { usage = (e.target as HTMLSelectElement).value as Usage; },
        }, ...USAGES.map((u) => h('option', { value: u }, USAGE_LABEL[u]))),
        h('button', { class: 'btn ghost sm', onclick: checkPermit }, 'Check permit'),
        usageVerdict(s.txs, lic.id))));

  return h('div', { class: 'card' }, head, serialLine, rightsRow(tier.rights), resale, usageBox);
};

/** dec: creator royalties ledger — kind mirrors the split that paid me:
 * primary sale → creator split, resale → royalty split. */
const saleRow = (s: State, sale: Sale, cut: number): HTMLElement => {
  const asset = s.assets.find((a) => a.id === sale.assetId);
  return h('tr', {},
    h('td', {}, asset?.name ?? sale.assetId),
    h('td', {},
      h('span', { class: `chip ${sale.primary ? '' : 'chip-chain'}` },
        sale.primary ? 'creator' : 'royalty')),
    h('td', {}, s.users[sale.buyerId]?.name ?? sale.buyerId),
    h('td', { class: 'amount' }, fmt(cut)),
    h('td', { class: 'faint sm' }, fmtDate(sale.ts)));
};

function royaltiesLedger(s: State): HTMLElement {
  const rows = s.sales
    .map((sale) => ({ sale, cut: creatorCutOf(s, sale) }))
    .filter((r): r is { sale: Sale; cut: number } => r.cut != null);
  if (rows.length === 0) return empty('No sales yet — list an asset on the Market and royalties will land here.');
  const lifetime = rows.reduce((sum, r) => sum + r.cut, 0);

  return ledgerTable(
    ['Asset', 'Kind', 'Buyer', 'My cut', 'When'],
    [
      ...rows.map((r) => saleRow(s, r.sale, r.cut)),
      // dec: totals derive from the rows above — no hardcoded figures.
      h('tr', {},
        h('td', { colspan: 3 }, h('b', {}, 'Lifetime earnings')),
        h('td', { class: 'amount' }, h('b', {}, fmt(lifetime))),
        h('td', {})),
    ],
  );
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
        mintChip(a)));
  return h('div', { class: 'card' }, ...mine.map(row));
}

function creatorSection(s: State): HTMLElement {
  return h('div', {},
    h('h2', {}, 'Royalties'),
    royaltiesLedger(s),
    h('h2', {}, 'My assets'),
    myAssetsCard(s),
    h('h2', {}, 'My licenses'),
    licensesGrid(s));
}

function reviewerSection(s: State): HTMLElement {
  const queue = s.assets.filter((a) => a.verification.status === 'needs-review');
  const mine = s.licenses.filter((l) => l.ownerId === s.session);
  return h('div', {},
    h('h2', {}, 'Review queue'),
    h('div', { class: 'banner' },
      h('div', { class: 'row spread' },
        h('div', {},
          h('b', {}, 'Cultural review'),
          h('p', { class: 'sm muted' }, 'Assets flagged by the AI scanner wait for your verdict.')),
        h('div', { class: 'row' },
          h('span', { class: `chip ${queue.length > 0 ? 'chip-warn' : 'chip-ok'}` },
            `${queue.length} needs review`),
          h('button', { class: 'btn sm', onclick: () => navTo('review') }, 'Go to Review tab')))),
    mine.length > 0
      ? h('div', {},
          h('h2', {}, 'My licenses'),
          licensesGrid(s))
      : null);
}

function buyerSection(s: State): HTMLElement {
  return h('div', {},
    h('h2', {}, 'My licenses'),
    h('div', { class: 'banner sm' },
      'Testing the revert path? The declined-payment simulation lives on the asset purchase panel (Market → an asset).'),
    licensesGrid(s));
}

/** dec: shared license list — creator, reviewer and buyer views all render the
 * same cards (feedback: creator purchases show under My licenses too). */
function licensesGrid(s: State): HTMLElement {
  const mine = s.licenses.filter((l) => l.ownerId === s.session);
  if (mine.length === 0) return empty('No licenses yet — buy one from the Market.');
  return h('div', { class: 'grid two' }, ...mine.map((l) => licenseCard(s, l)));
}

/** dec: ledger rows — reverted rows carry .reverted so .ledger tints the row. */
function recentActivity(s: State): HTMLElement {
  if (s.txs.length === 0) return empty('Nothing on the ledger yet — your calls will appear here.');
  const row = (t: Tx, latest: boolean): HTMLElement =>
    h('tr', { class: latest ? 'now' : t.status === 'reverted' ? 'reverted' : undefined },
      h('td', { class: 'mono' }, fmtDate(t.ts)),
      h('td', {}, t.label),
      h('td', {}, onchainChip(t.onChain)),
      h('td', {},
        h('span', { class: `chip ${t.status === 'reverted' ? 'chip-err' : 'chip-ok'}` }, t.status)));
  return h('div', {},
    ledgerTable(
      ['Time', 'Call', 'Ledger', 'Status'],
      s.txs.slice(0, 6).map((t, i) => row(t, i === 0))),
  );
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
    h('p', { class: 'muted' }, 'Signed in as ', h('b', {}, me.name), ` (${me.role}).`),
    roleSection,
    recentActivity(s));
}
