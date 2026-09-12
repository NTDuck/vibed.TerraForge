import { CONFIG } from './config';
import { emptyState } from './seed';
import type { State } from './types';

/** Trust boundary: anything from localStorage is unvalidated — fail closed to fresh state. */
export function loadState(): State {
  try {
    const raw = localStorage.getItem(CONFIG.storeKey);
    if (!raw) return emptyState();
    const s = JSON.parse(raw) as State;
    if (typeof s.rev !== 'number' || !Array.isArray(s.assets) || typeof s.users !== 'object' || !s.users) {
      return emptyState();
    }
    return s;
  } catch {
    return emptyState();
  }
}

export const saveState = (s: State): void => {
  try {
    localStorage.setItem(CONFIG.storeKey, JSON.stringify(s));
  } catch {
    /* private mode / quota — mockup keeps running in memory */
  }
};

export const clearState = (): void => {
  try {
    localStorage.removeItem(CONFIG.storeKey);
  } catch {
    /* ignore */
  }
};
