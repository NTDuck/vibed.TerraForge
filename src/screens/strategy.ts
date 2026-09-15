import { h } from '../ui';
import { CONFIG } from '../config';

/** dec: the code derives percentages from CONFIG splits — never duplicated as literals. */
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
    h('p', { class: 'muted' }, 'TerraForge — a Vietnamese marketplace for AI-generated game assets, where provenance is verified off-chain and ownership is enforced on-chain.'),
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
        h('div', { class: 'row' }, h('h3', { class: 'grow' }, 'On-chain'), h('span', { class: 'chip chip-chain' }, 'trust layer')),
        sig(`${CONFIG.chain.asset}.register(metadataHash, provenance)`, 'D-2: ownership & provenance hash must be tamper-proof and publicly auditable.'),
        sig(`${CONFIG.chain.license}.issue(assetId, tier, price)`, 'D-3: require !alreadyLicensed && price match — money in, license out, no trusted middleman.'),
        sig(`${CONFIG.chain.enforcer}.permit(licenseId, right)`, 'D-3: the token enforces rights (use/resell/modify) itself, not platform goodwill.'),
        sig(`${CONFIG.chain.enforcer}.resale(licenseId, to, price)`, 'Resale routes the creator royalty automatically inside the transfer.'),
        sig('royaltySplit → creator / platform', 'Deterministic split at transfer time; nothing to renegotiate.'),
      ),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h3', { class: 'grow' }, 'Off-chain'), h('span', { class: 'chip chip-off' }, 'TerraForge judgement layer')),
        h('p', { class: 'sm' }, h('b', {}, 'AI provenance scan'), ' — ', h('span', { class: 'muted' }, 'similarity + traceability scoring against registered works; heavy models, private embeddings.')),
        h('p', { class: 'sm' }, h('b', {}, 'Human cultural review'), ' — ', h('span', { class: 'muted' }, 'reviewers judge cultural sensitivity a model cannot sign off on.')),
        h('p', { class: 'sm' }, h('b', {}, 'Fiat gateway'), ' — ', h('span', { class: 'muted' }, `${CONFIG.fiatMethods.join(' / ')} → the backend verifies the payment → a signed oracle reports the result to the chain.`)),
        h('p', { class: 'sm' }, h('b', {}, 'File storage'), ' — ', h('span', { class: 'muted' }, 'asset binaries off-chain, only the content hash anchors them (D-2: cost & privacy).')),
        h('p', { class: 'sm muted' }, 'Why off-chain: model inference and user data are too costly and privacy-sensitive to put on-chain — only the verdict hash lands on-chain.'),
      ),
    ),
    h('h3', {}, 'Buyer flow'),
    h('div', { class: 'steps' },
      ['Buyer', 'Fiat payment', 'Payment verify', 'LicenseIssuer.issue', 'LicenseNFT'].map((label, i) =>
        h('span', { class: `step${i === 0 ? ' now' : ''}`, 'data-n': String(i + 1) }, label),
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
        h('p', { class: 'sm' }, 'The AI layer is an off-chain oracle: it produces a signed verdict that the chain trusts but does not compute. Blockchain guarantees the verdict\u2019s integrity and attachment to the asset — it cannot run the model. This keeps TerraForge\u2019s differentiation in the verification UX while the chain stays a minimal trust anchor (D-2/D-3).'),
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
      (
        [
          ['Y0', 'Design + prototype', 'This mockup: full purchase, verification and royalty flows simulated against Polygon testnet contracts.'],
          ['Y1', 'Testnet pilot', 'Real testnet deployment, onboarding creators, first cultural review board convened.'],
          ['Y2', 'Mainnet + fiat rails', 'Mainnet launch with MoMo/ZaloPay/Napas settlement and an asset passport standard.'],
          ['Y3', 'Cross-platform passport', 'License passports consumed by Unity, Unreal and Godot plugins — the engine enforces rights.'],
          ['Yx', 'Governance DAO', 'Protocol fees, review policy and registry upgrades move to a creator/reviewer DAO.'],
        ] as Array<[string, string, string]>
      ).map(([phase, title, body]) =>
        h('div', { class: 'row' },
          h('span', { class: 'chip' }, phase),
          h('b', {}, title),
          h('span', { class: 'sm muted grow' }, body),
        ),
    ),
    // 6 — References: numbered chips, full citation in a themed tooltip on hover/focus.
    h('h2', {}, 'References'),
    h(
      'div',
      { class: 'row refchips' },
      [
        'Béguelin, C., Boneh, D. and Nelson, E. (2026), \'Formal Verification and Security Weaknesses in Digital Media Provenance Standards (C2PA)\', arXiv preprint arXiv:2604.24890.',
        'C2PA (2024), Content Credentials: C2PA Technical Specification, Coalition for Content Provenance and Authenticity.',
        'Caldarelli, G. (2020), \'Understanding the Blockchain Oracle Problem: A Systematic Review\', Future Internet, 12(11), p. 202.',
        'Collomosse, J., Steer, C. and Cooper, M. (2024), \'EKILA: Synthetic Media Attribution and Rights Management using C2PA and NFTs\', IEEE Computer Graphics and Applications / arXiv preprint arXiv:2304.04639.',
        'Lee, S., Kim, H. and Park, J. (2026), \'A Study on Broker-Assisted Blockchain Trust Chains for Provenance and Integrity Verification of Generative Media Using Watermarking, Semantic Fingerprinting, and C2PA\', Applied Sciences, 16(7), p. 3391.',
        'Tan, X., Wang, Y. and Zhang, L. (2026), \'A Blockchain-Backed Framework for Verifiable Provenance Identification of AI-Generated Content\', arXiv preprint arXiv:2602.02412.',
        'Buolamwini J and Gebru T (2018) \'Gender shades: intersectional accuracy disparities in commercial gender classification\', Proceedings of Machine Learning Research, 81:77–91.',
        'Crawford K (2021) Atlas of AI: power, politics, and the planetary costs of artificial intelligence, Yale University Press, New Haven.',
        'Eskandari S, Clark J, Barrera D and Stobert E (2018) \'A first look at the usability of bitcoin key management\', NDSS Workshop on Usable Security (USEC), 18–21 February, Internet Society, Reston.',
        'Fairfield J (2021) \'Tokenized: the law of non-fungible tokens and unique digital property\', Indiana Law Journal, 97(4):1261–1313.',
        'Guadamuz A (2021) \'What do you actually own when you buy an NFT?\', TechnoLlama, accessed 15 September 2026, https://www.technollama.co.uk/what-do-you-actually-own-when-you-buy-an-nft.',
        'Henderson P, Xue C, Zhao V, Liang P and Jurafsky D (2023) Foundation models and fair use, arXiv, doi:10.48550/arXiv.2303.15715.',
        'Luu L, Chu DH, Olickel H, Saxena P and Hobor A (2016) \'Making smart contracts smarter\', Proceedings of the 2016 ACM SIGSAC Conference on Computer and Communications Security, ACM, New York, pp. 254–269, doi:10.1145/2976749.2978309.',
        'Murray A (2023) Information technology law: the law and society, 5th edn, Oxford University Press, Oxford.',
        'National Assembly of Vietnam (2022) Law on Intellectual Property (Law No. 07/2022/QH15), National Assembly of Vietnam, Hanoi.',
        'Saltini R, Zhang F, Hyland-Wood D and Brainard J (2023) \'Decentralized governance and upgradeability mechanisms in smart contracts\', IEEE Transactions on Network and Service Management, 20(3):3012–3025, doi:10.1109/TNSM.2023.3289104.',
      ].map((ref, i) => {
        const chip = h('button', { class: 'chip refchip', type: 'button', 'aria-label': 'Citation ' + (i + 1) }, `[${i + 1}]`);
        const tip = h('span', { class: 'reftip', role: 'tooltip' }, ref);
        const wrap = h('span', { class: 'refwrap' }, chip, tip);
        const show = (): void => wrap.classList.add('on');
        const hide = (): void => wrap.classList.remove('on');
        chip.addEventListener('mouseenter', show);
        chip.addEventListener('mouseleave', hide);
        chip.addEventListener('focus', show);
        chip.addEventListener('blur', hide);
        return wrap;
      }),
    ),

    // 7 — Footer note
    h('p', { class: 'sm faint' }, 'TerraForge is a course mockup (INTE2581): no real blockchain, payments or AI inference — all state lives in the browser. See the project README for the whiteboard sections this screen summarises.'),
  );
}
