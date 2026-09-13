import { commit, getState } from '../app';
import { setReview, toggleWallet } from '../store';
import { glyphFor } from '../lib/glyph';
import { h, fmtDate, verifChip, notify } from '../ui';
import { REVIEWER } from '../seed';
import type { Asset } from '../types';

/** dec: reviewer persona guard — review actions mutate cultural verdicts. Only
 * the seeded reviewer account may act. Everyone else gets an explanatory banner. */
function personaBanner(): HTMLElement {
  const who = getState().session ? getState().users[getState().session as string].name : 'you';
  return h('div', { class: 'banner warn' },
    h('div', { class: 'row spread' },
      h('span', { class: 'grow' },
        `Cultural review is reserved for the human reviewer persona (Chị Phạm). `,
        who === 'Chị Phạm' ? '' : `You are signed in as ${who} — use Sign in to switch personas.`),
      h('button', { class: 'btn sm', onclick: () => commit((s) => toggleWallet(s)) }, 'Sign in'),
    ),
  );
}

/** dec: one reviewable asset — glyph + provenance on top, AI reasons, then the
 * verdict form. The textarea lives outside state. The click handler reads it. */
function reviewCard(asset: Asset, reviewerName: string): HTMLElement {
  const v = asset.verification;
  const creator = getState().users[asset.creatorId]?.name ?? asset.creatorId;

  const note = h('textarea', {
    rows: 3,
    placeholder: `Reviewer note (optional — default: "${reviewerName} cleared this for cultural sensitivity.")`,
    'aria-label': 'Review note',
  }) as HTMLTextAreaElement;

  const decide = (approved: boolean): void => {
    commit((s) => setReview(s, asset.id, approved, note.value).state);
    notify(approved ? 'ok' : 'warn', `${approved ? 'Approved' : 'Rejected'} "${asset.name}" — verdict recorded`);
  };

  return h('div', { class: 'card' },
    h('div', { class: 'row' },
      h('div', { class: 'glyph' }, glyphFor(asset.kind, 40)),
      h('div', { class: 'grow' },
        h('h3', { style: 'margin:0' }, asset.name),
        h('div', { class: 'sm muted' }, `by ${creator} · model: ${asset.model}`)),
      verifChip(v.status),
    ),
    h('dl', { class: 'kv', style: 'margin-top: var(--space-3)' },
      h('dt', null, 'Similarity'),
      h('dd', null, `${v.similarity.toFixed(1)}%`),
      h('dt', null, 'Traceability'),
      h('dd', null, `${v.traceability.toFixed(0)}%`),
    ),
    h('ul', { class: 'sm muted' },
      ...(v.reasons ?? ['No AI reasons recorded.']).map((r) => h('li', null, r))),
    h('div', { class: 'field' },
      h('label', null, 'Reviewer note'),
      note,
    ),
    h('div', { class: 'row' },
      h('button', { class: 'btn accent', onclick: () => decide(true) }, 'Approve'),
      h('button', { class: 'btn danger', onclick: () => decide(false) }, 'Reject'),
    ),
  );
}

export function renderReview(): HTMLElement {
  const s = getState();
  const isReviewer = s.session === REVIEWER;

  const queue = s.assets.filter((a) => a.verification.status === 'needs-review');
  const decided = s.assets.filter((a) => a.review != null);

  return h('section', { class: 'wrap' },
    h('div', { class: 'row spread' },
      h('h1', { style: 'margin:0' }, 'Cultural review'),
      h('span', { class: 'chip' }, `${queue.length} in queue`),
    ),
    h('p', { class: 'muted' },
      'Whiteboard step between the AI verdict and mint: a human reviewer weighs provenance ' +
      'stats and cultural context before an asset can go on-chain.'),
    !isReviewer && personaBanner(),
    isReviewer
      ? (queue.length === 0
        ? h('div', { class: 'banner' }, 'Queue clear. No assets await cultural review.')
        : h('div', { class: 'grid' }, ...queue.map((a) => reviewCard(a, s.users[REVIEWER].name))))
      : null,
    h('h2', null, 'Review verdict history'),
    decided.length === 0
      ? h('p', { class: 'muted' }, 'No verdicts yet — approved and rejected reviews will appear here.')
      : h('table', { class: 'ledger' },
        h('thead', null,
          h('tr', null,
            h('th', null, 'Time'),
            h('th', null, 'Asset'),
            h('th', null, 'Verdict'),
            h('th', null, 'Note'))),
        h('tbody', null,
          ...decided.map((a) => {
            const r = a.review as NonNullable<Asset['review']>;
            return h('tr', null,
              h('td', { class: 'mono' }, fmtDate(r.at)),
              h('td', null, a.name),
              h('td', null, h('span', { class: `chip ${r.approved ? 'chip-ok' : 'chip-err'}` }, r.approved ? 'Approved' : 'Rejected')),
              h('td', { class: r.note ? 'sm' : 'sm faint' }, r.note || 'No note'),
            );
          })),
      ),
  );
}
