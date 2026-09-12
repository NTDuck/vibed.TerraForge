import { CONFIG } from './config';
import { delay } from './lib/id';
import { commit, getState } from './app';
import { issueLicense, setPurchaseStep } from './store';
import { notify } from './ui';

/**
 * dec: purchase orchestration mirrors the whiteboard buyer flow:
 * fiat payment → backend verification → smart contract issues license (+ royalty split).
 * Steps are distinct UI states so the mockup can show on-chain vs off-chain boundaries;
 * the ledger mutation itself is atomic in issueLicense.
 */
export async function runPurchase(assetId: string, tierId: string, method: string, failPayment: boolean): Promise<void> {
  const wait = (ms: number) => delay(ms * CONFIG.demoSpeed);

  commit((s) => setPurchaseStep(s, 'paying', { method }));
  await wait(600);
  if (failPayment) {
    commit((s) => setPurchaseStep(s, 'failed', { error: `Payment declined by ${method} (simulated).` }));
    notify('err', 'Fiat payment failed — no license issued.');
    return;
  }

  commit((s) => setPurchaseStep(s, 'verifying'));
  await wait(700);
  commit((s) => setPurchaseStep(s, 'issuing'));
  await wait(500);

  const s = getState();
  const res = issueLicense(s, s.session ?? '', assetId, tierId, method);
  if (res.error || !res.license) {
    const err = res.error ?? 'Issuance failed.';
    commit((st) => setPurchaseStep(st, 'failed', { error: err }));
    notify('err', err);
    return;
  }
  const lic = res.license;
  commit((st) => setPurchaseStep(st, 'done', { licenseId: lic.id }));
  notify('ok', `License NFT issued — serial #${lic.serial} · ${lic.txHash}`);
}
