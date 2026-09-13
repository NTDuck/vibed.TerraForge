import { commit } from './app';
import { toast } from './store';

/** dec: app-level toast from async flows. Commit-driven, so it re-renders. */
export function notify(kind: 'ok' | 'warn' | 'err', msg: string): void {
  commit((s) => toast(s, kind, msg));
  setTimeout(() => commit((s) => ({ ...s, toasts: s.toasts.filter((t) => t.msg !== msg || t.kind !== kind) })), 4200);
}

import type { VerificationStatus } from './types';

/** dec: hyperscript renderer — typed DOM builder without a framework (ponytail). */
export function h(tag: string, attrs?: Record<string, unknown> | null, ...kids: unknown[]): HTMLElement {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v as string;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'value') (el as unknown as HTMLInputElement).value = v as string;
      else if (k === 'checked') (el as unknown as HTMLInputElement).checked = Boolean(v);
      else if (k === 'disabled' || k === 'selected' || k === 'open') (el as unknown as Record<string, boolean>)[k] = Boolean(v);
      else el.setAttribute(k, String(v));
    }
  }
  appendKids(el, kids);
  return el;
}

function appendKids(el: HTMLElement, kids: unknown[]): void {
  for (const k of kids.flat(9) as unknown[]) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const fmt = (vnd: number): string => vnd.toLocaleString('vi-VN') + '₫';

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const qs = (sel: string, root: ParentNode = document): HTMLElement =>
  root.querySelector(sel) as HTMLElement;

/** dec: hash router — `#/screen/id`. Deep-linkable without a router lib. */
export function route(): { screen: string; id?: string } {
  const [, screen, id] = location.hash.split('/');
  return { screen: screen || 'market', id };
}

export function navTo(screen: string, id?: string): void {
  location.hash = `#/${screen}${id ? '/' + id : ''}`;
}

export const VERIF_META: Record<VerificationStatus, { label: string; cls: string }> = {
  'awaiting-ai': { label: 'Awaiting AI scan', cls: 'chip-warn' },
  'ai-passed': { label: 'AI verified', cls: 'chip-ok' },
  'needs-review': { label: 'Human review required', cls: 'chip-warn' },
  rejected: { label: 'Rejected', cls: 'chip-err' },
  verified: { label: 'Verified', cls: 'chip-ok' },
};

export const verifChip = (status: VerificationStatus): HTMLElement => {
  const m = VERIF_META[status];
  return h('span', { class: `chip ${m.cls}` }, m.label);
};

export const onchainChip = (on: boolean): HTMLElement =>
  h('span', { class: `chip ${on ? 'chip-chain' : 'chip-off'}` }, on ? '⛓ on-chain' : 'off-chain');

/** dec: role picker shared by wallet overlay + empty-state prompts. */
export const ROLES = [
  { id: 'u-an', label: 'An Trần — creator', hint: 'Upload assets, mint, track royalties' },
  { id: 'u-binh', label: 'Bình Lê — buyer', hint: 'Buy licenses, resell, usage checks' },
  { id: 'u-chi', label: 'Chị Phạm — reviewer', hint: 'Cultural review queue' },
] as const;
