import { commit, getState } from '../app';
import { mint, resolveVerification, startCompat, finishCompat, submitAsset } from '../store';
import { CONFIG } from '../config';
import { compatRow } from '../lib/compat-ui';
import { h, fmtDate, navTo, notify, verifChip, ROLES } from '../ui';
import { glyphFor } from '../lib/glyph';
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
  const imgUrl = h('input', { type: 'text', placeholder: 'https://… or leave empty' }) as HTMLInputElement;
  const galleryUrls = h('textarea', { rows: 3, placeholder: 'https://… one per line' }) as HTMLTextAreaElement;
  const platChecks = CONFIG.compatPlatforms.map((p) => ({
    p,
    box: h('input', { type: 'checkbox', checked: true }) as HTMLInputElement,
  }));

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
        const display = imgUrl.value.trim();
        const lines = galleryUrls.value.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && l !== display);
        const images = display ? { display, gallery: [display, ...lines] } : undefined;
        const platforms = platChecks.filter((x) => x.box.checked).map((x) => x.p);
        let asset: Asset | undefined;
        commit((s) => {
          const r = submitAsset(s, {
            name: name.value.trim(),
            kind: kind.value as AssetKind,
            blurb: blurb.value.trim(),
            model: model.value,
            similarity: Number(sim.value),
            traceability: Number(trace.value),
            platforms,
          });
          asset = r.asset;
          return r.state;
        });
        // dec: resolve immediately in a second commit so the asset lands with its
        // assess() verdict (same bands shown under this form) before navigating.
        // The same commit attaches the pasted image URLs. store stays pure.
        let verdictId = '';
        commit((st) => {
          const r = resolveVerification(st, asset!.id);
          verdictId = r.asset.id;
          if (!images) return r.state;
          return { ...r.state, assets: r.state.assets.map((x) => (x.id === r.asset.id ? { ...x, images } : x)) };
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
    h('div', { class: 'field' }, h('label', null, 'Display image URL'), imgUrl),
    h('div', { class: 'field' }, h('label', null, 'Gallery URLs (one per line)'), galleryUrls),
    h('div', { class: 'field' }, h('label', null, 'Target platforms'), platChecks.map((x) => h('label', { class: 'row', style: 'gap: var(--space-2); align-items: center' }, x.box, x.p))),
    h('div', { class: 'field', style: 'margin-top: var(--space-4); margin-bottom: 0' }, submit),
  );
}

/** dec: compatibility passport for the newest upload. Chips show the target
 * engines. The button runs the second verification layer. Criterion rows
 * appear after the run. A fail routes the asset to human review. */
function compatCard(a: Asset): HTMLElement {
  const run = a.verification.compat!;
  const kids: unknown[] = [
    h('h3', null, 'Compatibility passport'),
    h('p', { class: 'sm muted', style: 'margin:0' }, a.name),
    h('div', { class: 'row' }, ...run.platforms.map((p) => h('span', { class: 'chip' }, p))),
  ];
  if (run.status === 'pending') {
    kids.push(
      h('div', { class: 'row' },
        h('button', {
          class: 'btn accent sm',
          type: 'button',
          onclick: () => {
            commit((s) => startCompat(s, a.id).state);
            setTimeout(() => commit((s) => finishCompat(s, a.id).state), 600 * CONFIG.demoSpeed);
          },
        }, 'Run Compatibility check'),
      ),
    );
  } else if (run.status === 'running') {
    kids.push(h('p', { class: 'sm muted' }, 'Engine checks are running…'));
  } else {
    for (const p of run.platforms) {
      kids.push(h('h4', { style: 'margin-bottom: var(--space-1)' }, p));
      kids.push(...(run.results[p] ?? []).map((c) => compatRow(c, c.pass ? 'pass' : 'fail')));
    }
    const allPass = run.platforms.every((p) => (run.results[p] ?? []).every((c) => c.pass));
    kids.push(
      h('div', { class: 'row' }, allPass
        ? h('span', { class: 'chip chip-ok' }, 'Compatibility Verified')
        : h('span', { class: 'chip chip-warn' }, 'Needs Review - routed to human reviewer')),
    );
  }
  return h('div', { class: 'card' }, ...kids);
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

  const gateOpen = v.status === 'verified' && v.compat?.status === 'verified';
  const gateHint = v.status !== 'verified'
    ? 'AI provenance must clear first'
    : 'Both layers must verify before mint';
  const foot = h('div', { class: 'row' });
  if (v.status === 'verified' && !a.tokenId) {
    foot.append(
      h(
        'button',
        {
          class: 'btn accent sm',
          disabled: !gateOpen,
          title: gateOpen ? undefined : `Mint gate: ${gateHint}. Both layers must verify before mint`,
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
  const newest = mine[mine.length - 1];
  const passport = newest && newest.verification.compat ? compatCard(newest) : null;
  return h(
    'section',
    { class: 'wrap' },
    h('h1', null, 'Upload'),
    h('p', { class: 'muted' }, 'Three gates before anything is tradable: AI provenance, human cultural review, on-chain mint.'),
    h(
      'div',
      { class: 'grid two' },
      uploadForm(),
      h('div', null, passport),
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
