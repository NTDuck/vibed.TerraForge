import { emptyState } from './seed';
import { saveState } from './persist';
import type { State } from './types';

/** dec: single mutable container; React-free — commit() applies a pure transition,
 * persists, and notifies subscribers (main.ts re-renders). No framework. */
let current: State = emptyState();
const listeners = new Set<() => void>();

export const getState = (): State => current;

/** test/seed hook only */
export const setState = (s: State): void => {
  current = s;
};

/** dec: the ONLY way screens change state — pure (s) => next transition. */
export function commit(fn: (s: State) => State): void {
  current = fn(current);
  saveState(current);
  for (const l of listeners) l();
}

export function subscribe(l: () => void): void {
  listeners.add(l);
}

export function resetState(): void {
  current = emptyState();
  saveState(current);
  for (const l of listeners) l();
}
