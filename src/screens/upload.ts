import { commit, getState } from '../app';
import { mint, resolveVerification, submitAsset } from '../store';
import { CONFIG } from '../config';
import { glyphFor } from '../lib/glyph';
import { h, fmtDate, navTo, notify, verifChip, ROLES } from '../ui';
import type { Asset, AssetKind } from '../types';

const KINDS: AssetKind[] = ['character', 'skin', 'accessory', 'artwork', 'audio', 'environment'];
const MODELS = ['SenDiffusion XL', 'SenDiffusion Sky', 'SonicBloom v2', 'VectorMuse 3'];

/** dec: live "22 %" readout — input listener only, no commit/re-render. */
function bindRange(input: HTMLInputElement, out: HTMLElement): void {
  const sync = (): void => {
    out.textContent = `${input.value} %`;
  };
  input.addEventListener('input', sync);
  sync();
}

/** dec: three threshold rows — chips interpolate CONFIG verbatim so assess()
 * stays the single source of truth. The code restates no band numbers. */
function verificationBands(): HTMLElement {
  const { passBelow, rejectAt } = CONFIG.aiSimilarity;
  const traceMin = CONFIG.sourceTraceabilityMin;
  const band = (chip: string, text: string): HTMLElement =>
    h('div', { class: 'row' }, h('span', { class: 'chip' }, chip), h('span', { class: 'sm muted' }, text));
  return h(
    'div',
    { class: 'flow' },
    band(`AI similarity < ${passBelow}%`, 'Machine-verified. The scan clears the asset and mint opens straight away.'),
    band(
      `AI similarity ≥ ${passBelow}%`,
      `Cultural review. A human reviewer weighs the asset before it can go on-chain — from ${rejectAt}% up the scan auto-rejects.`,
    ),
    band(`Traceability < ${traceMin}%`, 'Source audit. Provenance is re-checked before any verdict stands.'),
  );
}

function uploadForm(): HTMLElement {
  const name = h('input', { type: 'text', placeholder: 'Dragon of Hạ Long Bay' }) as HTMLInputElement;
  const blurb = h('textarea', { rows: 3, placeholder: 'What is this asset? Style, references, gameplay use…' }) as HTMLTextAreaElement;
  const kind = h('select', null, ...KINDS.map((k) => h('option', { value: k }, k))) as HTMLSelectElement;
  const model = h('select', null, ...MODELS.map((m) => h('option', { value: m }, m))) as HTMLSelectElement;
  const sim = h('input', { type: 'range', min: '0', max: '100', value: '22' }) as HTMLInputElement;
  const simVal = h('span', { class: 'val' });
  const trace = h('input', { type: 'range', min: '0', max: '100', value: '92' }) as HTMLInputElement;
  const traceVal = h('span', { class: 'val' });
  bindRange(sim, simVal);
  bindRange(trace, traceVal);

  const submit = h(
    'button',
    {
      class: 'btn accent',
      type: 'button',
      style: 'width: 100%',
      onclick: () => {
        if (!name.value.trim()) {
          notify('warn', 'Give the asset a name before submitting.');
          return;
        }
        let asset: Asset | undefined;
        commit((s) => {
          const r = submitAsset(s, {
            name: name.value.trim(),
            kind: kind.value as AssetKind,
            blurb: blurb.value.trim(),
            model: model.value,
            similarity: Number(sim.value),
            traceability: Number(trace.value),
            platforms: [],
          });
          asset = r.asset;
          return r.state;
        });
        // dec: resolve immediately in a second commit so the asset lands with its
        // assess() verdict (same bands shown under this form) before navigating.
        let verdictId = '';
        commit((st) => {
          const r = resolveVerification(st, asset!.id);
          verdictId = r.asset.id;
          return r.state;
        });
        navTo('asset', verdictId);
      },
    },
    'Submit',
  );

  return h(
    'div',
    { class: 'card' },
    h('h2', null, 'Submit an asset'),
    h('div', { class: 'field' }, h('label', null, 'Name'), name),
    h('div', { class: 'field' }, h('label', null, 'Blurb'), blurb),
    h('div', { class: 'field' }, h('label', null, 'Kind'), kind),
    h('div', { class: 'field' }, h('label', null, 'Generative model'), model),
    h('div', { class: 'field' }, h('label', null, 'AI similarity vs registered works (lower is better)'), h('div', { class: 'range' }, sim, simVal)),
    h('div', { class: 'field' }, h('label', null, 'Source traceability (higher is better)'), h('div', { class: 'range' }, trace, traceVal)),
    h('p', { class: 'faint sm' }, 'Verdict comes from the same assess() bands shown below.'),
    h('h3', null, 'How verification works'),
    verificationBands(),
    h('div', { class: 'field', style: 'margin-top: var(--space-4); margin-bottom: 0' }, submit),
  );
}

/** dec: one of my uploads — glyph, name, verdict + mint status chips. Rejected
 * rows surface only the first reason, with a faint "+n more" overflow marker. */
function uploadRow(a: Asset): HTMLElement {
  const v = a.verification;
  const chips = h('div', { class: 'row' }, verifChip(v.status));
  if (v.status === 'needs-review') chips.append(h('span', { class: 'chip chip-warn' }, 'In review'));
  chips.append(
    a.tokenId
      ? h('span', { class: 'chip chip-chain' }, `minted ${a.tokenId}`)
      : h('span', { class: 'chip chip-off' }, 'not minted'),
  );

  const card = h(
    'div',
    { class: 'card' },
    h(
      'div',
      { class: 'row' },
      h('div', { class: 'glyph' }, glyphFor(a.kind, 32)),
      h('strong', { class: 'grow' }, a.name),
      chips,
    ),
  );

  const foot = h('div', { class: 'row' });
  if (v.status === 'verified' && !a.tokenId) {
    foot.append(
      h(
        'button',
        {
          class: 'btn accent sm',
          onclick: () => {
            let tokenId = '';
            commit((s) => {
              const r = mint(s, a.id);
              tokenId = r.asset.tokenId!;
              return r.state;
            });
            notify('ok', `Minted ${tokenId}`);
          },
        },
        'Mint',
      ),
    );
  }
  foot.append(h('span', { class: 'faint sm' }, fmtDate(a.createdAt)));
  card.append(foot);

  if (v.status === 'rejected' && v.reasons?.length) {
    const more = v.reasons.length - 1;
    card.append(
      h('div', { class: 'sm muted' }, v.reasons[0], more > 0 ? h('span', { class: 'faint' }, ` +${more} more`) : null),
    );
  }
  return card;
}

export function renderUpload(): HTMLElement {
  const s = getState();
  const user = s.session ? s.users[s.session] : undefined;
  if (!user || user.role !== 'creator') {
    return h(
      'section',
      { class: 'wrap' },
      h('h1', null, 'Upload'),
      h(
        'div',
        { class: 'banner warn' },
        h('strong', null, 'Sign in as An Trần (creator) to upload'),
        h('p', { class: 'muted sm' }, `${ROLES[0].hint} — the upload desk only opens for creator accounts.`),
      ),
    );
  }

  const mine = s.assets.filter((a) => a.creatorId === user.id);
  return h(
    'section',
    { class: 'wrap' },
    h('h1', null, 'Upload'),
    h('p', { class: 'muted' }, 'Three gates before anything is tradable: AI provenance, human cultural review, on-chain mint.'),
    h(
      'div',
      { class: 'grid two' },
      uploadForm(),
      h(
        'div',
        null,
        h('h2', null, 'My uploads'),
        mine.length === 0
          ? h('div', { class: 'card' }, h('p', { class: 'muted sm' }, 'Nothing submitted yet — your uploads will appear here with their verification verdict and mint status.'))
          : h('div', { class: 'grid' }, ...mine.map((a) => uploadRow(a))),
      ),
    ),
  );
}
