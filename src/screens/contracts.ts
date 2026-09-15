import { h } from '../ui';
import { commit } from '../app';
import { CONFIG } from '../config';
import { toggleLedger } from '../store';

/** dec: one card per simulated contract — name, role, and the Solidity surface the demo calls. */
const CONTRACTS: Array<{ key: 'asset' | 'license' | 'enforcer'; role: string; code: string }> = [
  {
    key: 'asset',
    role: 'Anchors each asset on Polygon. The mint flow calls it once per asset.',
    code: `// SPDX-License-Identifier: MIT
contract GameAssetRegistry {
    function register(bytes32 assetHash)
        external returns (uint256 tokenId);
    // require(assetHash != bytes32(0))

    event Registered(uint256 indexed tokenId, address indexed creator);
}`,
  },
  {
    key: 'license',
    role: 'Mints license NFTs and takes payment. Called on every primary sale.',
    code: `// SPDX-License-Identifier: MIT
contract LicenseIssuer {
    function issue(address buyer, string calldata assetId, string calldata tierId)
        external payable returns (uint256 serial);
    // require(!alreadyLicensed[buyer][assetId])
    // require(msg.value == price[assetId][tierId])

    event LicenseIssued(uint256 indexed serial, address indexed buyer);
}`,
  },
  {
    key: 'enforcer',
    role: 'Guards resale and usage rights. Settles the creator royalty on transfer.',
    code: `// SPDX-License-Identifier: MIT
contract LicenseEnforcer {
    function resale(uint256 licenseId, address to) external payable;
    // require(rights[licenseId].resale)
    // require(resaleCount[licenseId] < 1)

    function permit(uint256 licenseId, string calldata usage)
        external view returns (bool allowed);
    // require(rights[licenseId][usage])

    event RoyaltySettled(uint256 indexed licenseId, uint256 amount, address indexed creator);
}`,
  },
];

/** dec: mirrors the call sites in store.ts — mint, issueLicense, transferLicense, recordUsage. */
const LEDGER_CALLS: Array<[string, string, string, string]> = [
  ['GameAssetRegistry', 'register(bytes32)', 'assetHash = hash(asset.id)', 'require(assetHash != 0)'],
  ['LicenseIssuer', 'issue(buyer, assetId, tierId)', 'payable — msg.value == tier price', 'require(!alreadyLicensed && msg.value == price)'],
  ['LicenseEnforcer', 'resale(licenseId)', 'royalty 10% to creator inside transfer', 'require(rights.resale && resaleCount < 1)'],
  ['LicenseEnforcer', 'permit(licenseId, usage)', 'usage = use / modify / resell', 'require(rights.usage)'],
];

export function renderContracts(): HTMLElement {
  return h(
    'section',
    { class: 'wrap' },

    h('h1', {}, 'Smart contracts'),
    h('p', { class: 'muted' }, 'Three simulated contracts anchor TerraForge on Polygon. The ledger records every call.'),

    h('div', { class: 'grid three' },
      CONTRACTS.map((c) =>
        h('div', { class: 'card' },
          h('h3', {}, CONFIG.chain[c.key]),
          h('p', { class: 'sm muted' }, c.role),
          h('p', { class: 'sm faint' }, 'Solidity interface (simulated)'),
          h('pre', {}, h('code', {}, c.code)),
        ),
      ),
    ),

    h('h2', {}, 'Commands used in the demo ledger'),
    h('table', { class: 'ledger' },
      h('thead', {},
        h('tr', {},
          h('th', {}, 'Contract'),
          h('th', {}, 'Function'),
          h('th', {}, 'Args'),
          h('th', {}, 'Guard'),
        ),
      ),
      h('tbody', {},
        LEDGER_CALLS.map(([contract, fn, args, guard]) =>
          h('tr', {},
            h('td', {}, h('code', {}, contract)),
            h('td', {}, h('code', {}, fn)),
            h('td', { class: 'sm' }, args),
            h('td', { class: 'sm muted' }, guard),
          ),
        ),
      ),
    ),

    h('p', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => commit(toggleLedger) }, 'Open SERSE Audit Ledger'),
    ),
  );
}
