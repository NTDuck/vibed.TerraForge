let n = 0;

export const uid = (prefix: string): string =>
  `${prefix}-${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const txHash = (): string =>
  '0x' +
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')).join('');

export const now = (): string => new Date().toISOString();

export const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
