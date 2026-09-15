import { h, fmt, fmtDate, ledgerTable, onchainChip, notify, ROLES } from '../ui';
import { commit, getState } from '../app';
import { login, logout, closeOverlays } from '../store';
import { glyphFor } from '../lib/glyph';
import type { State, Tx } from '../types';

/** dec: both overlays close on backdrop click only (target === overlay) so clicks
 * inside the panel never dismiss. Replaces the overlay host's single child. */
const backdrop = (panel: HTMLElement): HTMLElement =>
  h('div', {
    class: 'overlay',
    onclick: (e: Event) => {
      if (e.target === e.currentTarget) commit((s) => closeOverlays(s));
    },
  }, panel);
function connectCard(): HTMLElement {
  return h('div', { class: 'panel' },
    h('h2', { style: 'margin-top:0' }, 'Connect wallet'),
    h('p', { class: 'sm muted' }, 'Pick a demo persona. Simulated keys, no chain.'),
    h('div', { class: 'flow' },
      ...ROLES.map((r) =>
        h('button', {
          class: 'btn ghost',
          // dec: full-width + left-aligned so personas read as a menu list, not a pill row
          style: 'width:100%;text-align:left',
          onclick: () => {
            commit((s) => closeOverlays(login(s, r.id)));
            const name = getState().users[r.id]?.name ?? r.id;
            notify('ok', `Signed in as ${name}`);
          },
        },
          h('b', {}, r.label),
          h('div', { class: 'sm muted' }, r.hint)))),
  );
}
function identityCard(s: State): HTMLElement {
  const me = s.users[s.session as string];
  const myLicenses = s.licenses.filter((l) => l.ownerId === s.session);

  return h('div', { class: 'panel' },
    h('div', { class: 'row spread' },
      h('div', { class: 'row' },
        h('h2', { style: 'margin:0' }, me.name),
        h('span', { class: 'chip' }, me.role),
        h('code', { class: 'mono sm' }, me.address)),
      h('button', { class: 'btn ghost sm', onclick: () => commit((st) => logout(st)) }, 'Sign out'),
    ),
    h('h3', {}, 'Balances'),
    h('table', { class: 'ledger' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Account'), h('th', { style: 'text-align:right' }, 'Balance'))),
      h('tbody', {},
        ...Object.values(s.users).map((u) =>
          // dec: inline font-weight only to bold the session row — no one-off CSS class for one row
          h('tr', { style: u.id === s.session ? 'font-weight:600' : undefined },
            h('td', {}, u.name, u.id === s.session ? h('span', { class: 'chip', style: 'margin-left:6px' }, 'you') : null),
            h('td', { class: 'mono', style: 'text-align:right' }, fmt(u.vnd)))))),
    h('p', { class: 'sm muted' },
      'Network: Polygon — credentials are non-transferable ERC-721 records.'),
    h('h3', {}, 'My license NFTs'),
    myLicenses.length === 0
      ? h('p', { class: 'muted sm' }, 'No licenses yet — buy one from the market.')
      : h('div', { class: 'flow' },
        ...myLicenses.map((l) => {
          const asset = s.assets.find((a) => a.id === l.assetId);
          const tier = asset?.tiers.find((t) => t.id === l.tierId);
          return h('div', { class: 'card row spread' },
            h('div', { class: 'row' },
              h('span', { class: 'glyph' }, glyphFor(asset?.kind ?? 'artwork', 28)),
              h('div', {},
                h('b', {}, asset?.name ?? l.assetId),
                h('div', { class: 'sm muted' }, tier?.name ?? l.tierId))),
            h('span', { class: 'mono sm faint' }, `#${l.serial}`));
        })),
  );
}

export function renderWalletOverlay(): HTMLElement {
  const s = getState();
  return backdrop(s.session ? identityCard(s) : connectCard());
}

/** dec: 0x… hashes and contract calls are clickable — clicking tints the row
 * for 2s (we are already inside the ledger, nothing else to open). */
const flashRow = (row: HTMLElement): void => {
  row.style.background = 'color-mix(in oklab, var(--accent) 16%, transparent)';
  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  setTimeout(() => {
    row.style.background = '';
  }, 2000);
};

const addrBtn = (label: string, row: HTMLElement): HTMLElement =>
  h('button', { class: 'addr', onclick: () => flashRow(row) }, label);

/** dec: split label on 0x… hashes and render each as an .addr button. */
const labelCell = (label: string, row: HTMLElement): HTMLElement => {
  const parts = label.split(/(0x[0-9a-zA-Z.]+)/);
  return h('td', {}, ...parts.map((p) =>
    /^0x[0-9a-zA-Z.]+$/.test(p) ? addrBtn(p, row) : p));
};

function callCell(tx: Tx, row: HTMLElement): HTMLElement {
  if (!tx.call) return h('td', { class: 'faint' }, '—');
  const c = tx.call;
  return h('td', { class: 'mono' },
    addrBtn(`${c.contract}.${c.fn}(${c.args.join(', ')})`, row));
}

export function renderLedgerOverlay(): HTMLElement {
  const s = getState();
  const onChain = s.txs.filter((t) => t.onChain && t.status === 'confirmed').length;
  const offChain = s.txs.filter((t) => !t.onChain && t.status === 'confirmed').length;
  const reverted = s.txs.filter((t) => t.status === 'reverted').length;

  // dec: newest confirmed tx glows tiffany (one .now row per table).
  const nowId = s.txs.find((t) => t.status === 'confirmed')?.id;
  const row = (t: Tx): HTMLElement => {
    const tr = h('tr', {
      id: `tx-${t.id}`,
      class: t.id === nowId ? 'now' : t.status === 'reverted' ? 'reverted' : undefined,
    },
      h('td', { class: 'mono' }, fmtDate(t.ts)),
      h('td', { class: 'mono muted' }, t.kind));
    // dec: label + call cells need the row ref for click-flash, so append after.
    tr.append(
      labelCell(t.label, tr),
      callCell(t, tr),
      h('td', {}, onchainChip(t.onChain)),
      h('td', {}, h('span', { class: `chip ${t.status === 'confirmed' ? 'chip-ok' : 'chip-err'}` }, t.status)));
    return tr;
  };

  const table = ledgerTable(
    ['Time', 'Kind', 'Label', 'Call', 'Chain', 'Status'],
    s.txs.map((t) => row(t)),
  );

  return backdrop(h('div', { class: 'panel wide' },
    h('div', { class: 'row spread' },
      h('h2', { style: 'margin:0' }, 'SERSE Audit Ledger'),
      h('div', { class: 'row' },
        h('span', { class: 'chip chip-chain' }, `${onChain} on-chain`),
        h('span', { class: 'chip chip-off' }, `${offChain} off-chain`),
        h('span', { class: 'chip chip-err' }, `${reverted} reverted`))),
    s.txs.length === 0
      ? h('p', { class: 'muted' }, 'No transactions yet — buy a license or mint an asset.')
      : table,
  ));
}

