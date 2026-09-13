import { h, fmt, fmtDate, onchainChip, notify, ROLES } from '../ui';
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

function callCell(tx: Tx): HTMLElement {
  if (!tx.call) return h('td', { class: 'faint' }, '—');
  const c = tx.call;
  return h('td', { class: 'mono' }, `${c.contract}.${c.fn}(${c.args.join(', ')})`);
}
export function renderLedgerOverlay(): HTMLElement {
  const s = getState();
  const onChain = s.txs.filter((t) => t.onChain && t.status === 'confirmed').length;
  const offChain = s.txs.filter((t) => !t.onChain && t.status === 'confirmed').length;
  const reverted = s.txs.filter((t) => t.status === 'reverted').length;

  const table = h('table', { class: 'ledger' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Time'),
      h('th', {}, 'Kind'),
      h('th', {}, 'Label'),
      h('th', {}, 'Call'),
      h('th', {}, 'Chain'),
      h('th', {}, 'Status'))),
    h('tbody', {},
      ...s.txs.map((t) =>
        h('tr', { class: t.status === 'reverted' ? 'reverted' : undefined },
          h('td', { class: 'mono' }, fmtDate(t.ts)),
          h('td', { class: 'mono muted' }, t.kind),
          h('td', {}, t.label),
          callCell(t),
          h('td', {}, onchainChip(t.onChain)),
          h('td', {}, h('span', { class: `chip ${t.status === 'confirmed' ? 'chip-ok' : 'chip-err'}` }, t.status))))));

  return backdrop(h('div', { class: 'panel wide' },
    h('div', { class: 'row spread' },
      h('h2', { style: 'margin:0' }, 'Transaction ledger'),
      h('div', { class: 'row' },
        h('span', { class: 'chip chip-chain' }, `${onChain} on-chain`),
        h('span', { class: 'chip chip-off' }, `${offChain} off-chain`),
        h('span', { class: 'chip chip-err' }, `${reverted} reverted`))),
    s.txs.length === 0
      ? h('p', { class: 'muted' }, 'No transactions yet — buy a license or mint an asset.')
      : table,
  ));
}
