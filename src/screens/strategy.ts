import { h } from '../ui';
import { CONFIG } from '../config';

/** dec: percentages are derived from CONFIG splits — never duplicated as literals. */
const pct = (frac: number): string => `${(frac * 100).toFixed(0)}%`;

/** dec: mono contract-signature line for the on-chain card. */
const sig = (line: string, why: string): HTMLElement =>
  h('p', { class: 'sm' }, h('code', {}, line), ' — ', h('span', { class: 'muted' }, why));

const ASSET_KINDS: Array<[string, string]> = [
  ['character', 'Characters'],
  ['skin', 'Skins'],
  ['accessory', 'Accessories'],
  ['artwork', 'Artwork'],
  ['audio', 'Audio'],
  ['environment', 'Environments'],
];

/** dec: static report-support screen — purely presentational, reads CONFIG only, never mutates state. */
export function renderStrategy(): HTMLElement {
  const { passBelow, rejectAt } = CONFIG.aiSimilarity;
  const traceMin = CONFIG.sourceTraceabilityMin;
  const { creator, platform } = CONFIG.primarySplit;
  const { royalty } = CONFIG.secondarySplit;

  return h(
    'section',
    { class: 'wrap' },

    // 1 — Integrated strategy
    h('h1', {}, 'Strategy'),
    h('p', { class: 'muted' }, 'SenChain — a Vietnamese marketplace for AI-generated game assets, where provenance is verified off-chain and ownership is enforced on-chain.'),
    h('h2', {}, 'Integrated strategy'),
    h('div', { class: 'grid two' },
      h('div', { class: 'card' },
        h('h3', {}, 'Target users'),
        h('ul', { class: 'sm' },
          h('li', {}, h('b', {}, 'Vietnamese game studios'), ' — licensed, audit-ready assets without legal grey zones.'),
          h('li', {}, h('b', {}, 'Indie devs'), ' — affordable per-tier licenses with clear rights (use/resell/modify).'),
          h('li', {}, h('b', {}, 'AI artists'), ' — monetise generated work with cultural provenance recognised on-chain.'),
        ),
      ),
      h('div', { class: 'card' },
        h('h3', {}, 'Value proposition'),
        h('p', { class: 'sm' }, 'A license is an NFT: payment in familiar Vietnamese fiat rails, verification by an AI + human review layer, and rights that travel with the token — the marketplace becomes a court-admissible provenance record, not a download page.'),
      ),
    ),
    h('h3', {}, 'Supported assets'),
    h('div', { class: 'row' },
      ASSET_KINDS.map(([kind, label]) => h('span', { class: 'chip chip-chain', title: kind }, label)),
    ),
    h('h3', {}, 'Incentives & fees'),
    h('div', { class: 'grid three' },
      h('div', { class: 'card' },
        h('div', { class: 'row spread' },
          h('b', {}, 'Primary sale'),
          h('span', { class: 'chip chip-ok' }, `${pct(creator)} / ${pct(platform)}`),
        ),
        h('p', { class: 'sm muted' }, 'Creator keeps ', h('code', {}, pct(creator)), ', platform takes ', h('code', {}, pct(platform)), '.'),
      ),
      h('div', { class: 'card' },
        h('div', { class: 'row spread' },
          h('b', {}, 'Secondary resale'),
          h('span', { class: 'chip chip-warn' }, `${pct(royalty)} royalty`),
        ),
        h('p', { class: 'sm muted' }, 'Every resale routes ', h('code', {}, pct(royalty)), ' back to the original creator via LicenseEnforcer.'),
      ),
      h('div', { class: 'card' },
        h('div', { class: 'row spread' },
          h('b', {}, 'Fiat rails'),
          h('span', { class: 'chip' }, 'VN payment'),
        ),
        h('p', { class: 'sm muted' }, CONFIG.fiatMethods.join(' · '), ' — no wallet needed to buy.'),
      ),
    ),

    // 2 — System architecture
    h('h2', {}, 'System architecture'),
    h('div', { class: 'grid two' },
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h3', { class: 'grow' }, 'On-chain'), h('span', { class: 'chip chip-chain' }, '⛓ trust layer')),
        sig(`${CONFIG.chain.asset}.register(metadataHash, provenance)`, 'D-2: ownership & provenance hash must be tamper-proof and publicly auditable.'),
        sig(`${CONFIG.chain.license}.issue(assetId, tier, price)`, 'D-3: require !alreadyLicensed && price match — money in, license out, no trusted middleman.'),
        sig(`${CONFIG.chain.enforcer}.permit(licenseId, right)`, 'D-3: rights checks (use/resell/modify) enforced by the token itself, not platform goodwill.'),
        sig(`${CONFIG.chain.enforcer}.resale(licenseId, to, price)`, 'Resale routes the creator royalty automatically inside the transfer.'),
        sig('royaltySplit → creator / platform', 'Deterministic split at transfer time; nothing to renegotiate.'),
      ),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h3', { class: 'grow' }, 'Off-chain'), h('span', { class: 'chip chip-off' }, 'kast judgement layer')),
        h('p', { class: 'sm' }, h('b', {}, 'AI provenance scan'), ' — ', h('span', { class: 'muted' }, 'similarity + traceability scoring against registered works; heavy models, private embeddings.')),
        h('p', { class: 'sm' }, h('b', {}, 'Human cultural review'), ' — ', h('span', { class: 'muted' }, 'reviewers judge cultural sensitivity a model cannot sign off on.')),
        h('p', { class: 'sm' }, h('b', {}, 'Fiat gateway'), ' — ', h('span', { class: 'muted' }, `${CONFIG.fiatMethods.join(' / ')} → backend verifies payment → signed oracle relays result to the chain.`)),
        h('p', { class: 'sm' }, h('b', {}, 'File storage'), ' — ', h('span', { class: 'muted' }, 'asset binaries off-chain, only the content hash anchors them (D-2: cost & privacy).')),
        h('p', { class: 'sm muted' }, 'Why off-chain: model inference and user data are too costly and privacy-sensitive to put on-chain — only the verdict hash lands on-chain.'),
      ),
    ),
    h('h3', {}, 'Buyer flow'),
    h('div', { class: 'steps' },
      ['Buyer', 'Fiat payment', 'Oracle verify', 'LicenseIssuer.issue', 'LicenseNFT'].map((label, i) =>
        h('span', { class: `step${i === 0 ? ' now' : ''}` }, label),
      ),
    ),
    h('p', { class: 'sm faint' }, 'Off-chain steps: fiat gateway + backend verification; on-chain steps: oracle calls LicenseIssuer which mints the LicenseNFT.'),

    // 3 — AI positioning (B3)
    h('h2', {}, 'AI positioning'),
    h('div', { class: 'grid two' },
      h('div', { class: 'card' },
        h('h3', {}, 'Verification layer bands'),
        h('div', { class: 'row' },
          h('span', { class: 'chip chip-ok' }, `similarity < ${passBelow}% → pass`),
          h('span', { class: 'chip chip-warn' }, `${passBelow}–${rejectAt}% → human review`),
          h('span', { class: 'chip chip-err' }, `≥ ${rejectAt}% → reject`),
        ),
        h('p', { class: 'sm muted' }, `Additionally: source traceability < ${traceMin}% always triggers a human audit of the source material, regardless of similarity.`),
      ),
      h('div', { class: 'card' },
        h('h3', {}, 'AI as oracle, not chain feature'),
        h('p', { class: 'sm' }, 'The AI layer is an off-chain oracle: it produces a signed verdict that the chain trusts but does not compute. Blockchain guarantees the verdict\u2019s integrity and attachment to the asset — it cannot run the model. This keeps SenChain\u2019s differentiation in the verification UX while the chain stays a minimal trust anchor (D-2/D-3).'),
        h('p', { class: 'sm faint' }, '[Group to extend: industry talk — compare with existing AI-asset provenance standards (C2PA, content credentials) and where on-chain anchoring adds value.]'),
      ),
    ),

    // 4 — Limitations (whiteboard §6)
    h('h2', {}, 'Limitations'),
    h('div', { class: 'grid three' },
      h('div', { class: 'banner' },
        h('b', {}, 'Cybersecurity'),
        h('p', { class: 'sm' }, 'Key management for non-crypto users, smart-contract audit coverage, and upgrade governance for the registry/enforcer contracts remain open risks.'),
      ),
      h('div', { class: 'banner warn' },
        h('b', {}, 'Ethical'),
        h('p', { class: 'sm' }, 'The cultural review band depends on reviewer availability and judgement; bias in similarity models and consent of source material used for training are unresolved.'),
      ),
      h('div', { class: 'banner err' },
        h('b', {}, 'Legal'),
        h('p', { class: 'sm' }, 'An NFT is not a copyright: ownership of the token does not equal IP ownership; alignment with Vietnamese IP law and cross-border licensing terms need legal counsel.'),
      ),
    ),

    // 5 — Development plan (whiteboard §7)
    h('h2', {}, 'Development plan Y0 → Yx'),
    h('div', { class: 'flow' },
      (
        [
          ['Y0', 'chip', 'Design + prototype', 'This mockup: full purchase, verification and royalty flows simulated against SenChain Testnet contracts.'],
          ['Y1', 'chip-ok', 'Testnet pilot', 'Real testnet deployment, onboarding creators, first cultural review board convened.'],
          ['Y2', 'chip-chain', 'Mainnet + fiat rails', 'Mainnet launch with MoMo/ZaloPay/Napas settlement and an asset passport standard.'],
          ['Y3', 'chip-warn', 'Cross-platform passport', 'License passports consumed by Unity, Unreal and Godot plugins — rights checked in-engine.'],
          ['Yx', 'chip-err', 'Governance DAO', 'Protocol fees, review policy and registry upgrades move to a creator/reviewer DAO.'],
        ] as Array<[string, string, string, string]>
      ).map(([phase, chip, title, body]) =>
        h('div', { class: 'card' },
          h('div', { class: 'row spread' },
            h('div', { class: 'row' },
              h('span', { class: `chip ${chip}` }, phase),
              h('b', {}, title),
            ),
            h('span', { class: 'chip' }, 'Phase highlight'),
          ),
          h('p', { class: 'sm muted' }, body),
        ),
      ),
    ),

    // 6 — Footer note
    h('p', { class: 'sm faint' }, 'SenChain is a course mockup (INTE2581): no real blockchain, payments or AI inference — all state lives in the browser. See the project README for the whiteboard sections this screen summarises.'),
  );
}
