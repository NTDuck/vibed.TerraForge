import './theme';
import './style.css';
import { commit, getState, subscribe, resetState } from './app';
import { loadState, clearState } from './persist';
import { login, logout, toggleWallet, toggleLedger, closeOverlays, dropToast } from './store';
import { h, qs, navTo, route } from './ui';
import { renderMarket } from './screens/market';
import { renderAsset } from './screens/asset';
import { renderUpload } from './screens/upload';
import { renderDashboard } from './screens/dashboard';
import { renderReview } from './screens/review';
import { renderStrategy } from './screens/strategy';
import { renderWalletOverlay, renderLedgerOverlay } from './screens/overlays';
import { ROLES } from './ui';

import { setState } from './app';

setState(loadState());

const NAV = [
  { id: 'market', label: 'Market' },
  { id: 'upload', label: 'Upload' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'review', label: 'Review' },
  { id: 'strategy', label: 'Strategy' },
];

function renderNav(): void {
  const s = getState();
  const nav = qs('#nav');
  nav.replaceChildren(
    ...NAV.map((n) =>
      h(
        'a',
        {
          class: 'nav-link' + (route().screen === n.id ? ' active' : ''),
          href: `#/${n.id}`,
        },
        n.label,
      ),
    ),
  );

  const session = s.session ? s.users[s.session] : null;
  qs('#btn-wallet').replaceChildren(session ? `${session.name} · ${session.vnd.toLocaleString('vi-VN')}₫` : 'Sign in');
  qs('#btn-ledger').replaceChildren('⛓ Ledger');

  const btnReset = qs('#btn-reset');
  btnReset.replaceChildren('Reset demo data');
}

function renderToasts(): void {
  const s = getState();
  const host = qs('#o-toasts');
  host.replaceChildren(
    ...s.toasts.map((t) =>
      h('div', { class: `toast toast-${t.kind}`, onclick: () => commit((st) => dropToast(st, t.id)) }, t.msg),
    ),
  );
}

function renderOverlays(): void {
  const s = getState();
  qs('#o-wallet').replaceChildren(s.walletOpen ? renderWalletOverlay() : '');
  qs('#o-ledger').replaceChildren(s.ledgerOpen ? renderLedgerOverlay() : '');
}

const SCREENS: Record<string, (id?: string) => HTMLElement> = {
  market: () => renderMarket(),
  asset: (id) => renderAsset(id ?? ''),
  upload: () => renderUpload(),
  dashboard: () => renderDashboard(),
  review: () => renderReview(),
  strategy: () => renderStrategy(),
};

function renderScreen(): void {
  const { screen, id } = route();
  const main = qs('#screen');
  const r = SCREENS[screen] ?? SCREENS.market;
  main.replaceChildren(r(id));
}

function rerenderAll(): void {
  renderNav();
  renderScreen();
  renderOverlays();
  renderToasts();
}

function wireChrome(): void {
  qs('#btn-wallet').addEventListener('click', () => {
    const s = getState();
    if (!s.session) {
      // open wallet overlay in "sign-in" mode
      commit((st) => ({ ...st, walletOpen: true, ledgerOpen: false }));
      return;
    }
    commit(toggleWallet);
  });
  qs('#btn-ledger').addEventListener('click', () => commit(toggleLedger));
  qs('#btn-reset').addEventListener('click', () => {
    clearState();
    resetState();
    commit(logout);
    navTo('market');
    rerenderAll();
  });
  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') commit(closeOverlays);
  });
}

subscribe(rerenderAll);
window.addEventListener('hashchange', () => {
  commit(closeOverlays);
  rerenderAll();
});

wireChrome();
rerenderAll();

// dec: convenience — expose sign-in helper for the wallet overlay (ROLES drives it)
export { ROLES, login };
