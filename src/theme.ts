// Theme runtime. Applies a base16 scheme as CSS custom properties on :root.
// Self-initializes on import. Preference persists in localStorage.
import { DEFAULT_THEME, THEMES, type Base16Scheme } from './themes';

const KEY = 'terraforge-theme';

// Picker order: TerraForge custom first, then generated gallery schemes.
export const THEME_LIST: string[] = ['terraforge-tiffany', ...Object.keys(THEMES).filter((n) => n !== 'terraforge-tiffany')];

// Saved preference or the default. Storage can be unavailable.
function savedTheme(): string {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
// Human label for a scheme id: 'atelier-dune-light' -> 'Atelier Dune Light'.
function label(name: string): string {
  const words = name.split('-');
  return words.map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

function apply(scheme: Base16Scheme): void {
  const root = document.documentElement;
  const b = (k: keyof Base16Scheme): string => scheme[k];
  const props: Record<string, string> = {
    '--b00': b('base00'), '--b01': b('base01'), '--b02': b('base02'), '--b03': b('base03'),
    '--b04': b('base04'), '--b05': b('base05'), '--b06': b('base06'), '--b07': b('base07'),
    '--b08': b('base08'), '--b09': b('base09'), '--b0A': b('base0A'), '--b0B': b('base0B'),
    '--b0C': b('base0C'), '--b0D': b('base0D'), '--b0E': b('base0E'), '--b0F': b('base0F'),
    // derived roles reference the base slots above
    '--paper': 'var(--b00)',
    '--paper-2': 'var(--b01)',
    '--paper-3': 'var(--b02)',
    '--ink': 'var(--b05)',
    '--ink-dim': 'var(--b04)',
    '--ink-faint': 'var(--b03)',
    '--line': 'var(--b03)',
    '--line-strong': 'var(--b04)',
    '--accent': 'var(--b0D)',
    '--accent-strong': 'color-mix(in oklab, var(--accent) 82%, black)',
    '--accent-ink': 'color-mix(in oklab, var(--b00) 96%, black)',
    '--ok': 'var(--b0B)',
    '--warn': 'var(--b09)',
    '--err': 'var(--b08)',
  };
  for (const [k, v] of Object.entries(props)) root.style.setProperty(k, v);
}

export function applyTheme(name: string): void {
  const scheme = THEMES[name] ?? THEMES[DEFAULT_THEME];
  const id = THEMES[name] ? name : DEFAULT_THEME;
  apply(scheme);
  document.documentElement.setAttribute('data-theme', id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage may be unavailable; theme still applies for this session
  }
}

function wireSelect(): void {
  const sel = document.querySelector<HTMLSelectElement>('#theme-select');
  if (!sel) return;
  sel.replaceChildren(
    ...THEME_LIST.map((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = label(name);
      return opt;
    }),
  );
  sel.addEventListener('change', () => applyTheme(sel.value));
}

applyTheme(savedTheme());
wireSelect();
