"""Capture README screenshots + frames for an animated intro on the running mockup."""
import os
import pathlib
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:5173")
OUT = pathlib.Path("docs/img")
OUT.mkdir(parents=True, exist_ok=True)
CHROME = sorted(pathlib.Path("/nix/store").glob("*-chromium-*/bin/chromium"))[-1]

def shot(pg, name, full=False):
    pg.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
    print("shot", name)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=str(CHROME), args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=2)

    # 1. Market — fresh seed
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(900)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(900)
    shot(pg, "01-market")

    # 2. Asset detail + tiers + rights matrix
    pg.locator(".grid.assets .card").first.click(); pg.wait_for_timeout(600)
    shot(pg, "02-asset-detail")

    # 3. Buyer checkout — sign in, open purchase panel
    pg.click("#btn-wallet"); pg.wait_for_timeout(300)
    pg.locator("#o-wallet button", has_text="Bình Lê — buyer").click(); pg.wait_for_timeout(400)
    pg.locator("#screen button.btn.accent", has_text="Buy license").first.click(); pg.wait_for_timeout(500)
    shot(pg, "03-checkout")

    # 4. Purchase done — serial + splits
    pg.locator("#screen button.btn.accent", has_text="Confirm payment").click(); pg.wait_for_timeout(3200)
    shot(pg, "04-license-issued")

    # 5. Ledger overlay — on/off-chain + revert rows (trigger a revert first)
    pg.locator("#screen button", has_text="Close").click(); pg.wait_for_timeout(300)
    pg.locator("#screen button.btn.accent", has_text="Buy license").first.click(); pg.wait_for_timeout(300)
    pg.locator("#screen button.btn.accent", has_text="Confirm payment").click(); pg.wait_for_timeout(3200)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    pg.click("#btn-ledger"); pg.wait_for_timeout(400)
    shot(pg, "05-ledger")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)

    # 6. Upload + AI provenance (creator)
    pg.click("#btn-wallet"); pg.wait_for_timeout(300)
    pg.locator("#o-wallet button", has_text="Sign out").click(); pg.wait_for_timeout(250)
    pg.locator("#o-wallet button", has_text="An Trần — creator").click(); pg.wait_for_timeout(400)
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(500)
    shot(pg, "06-upload-provenance")

    # 7. Review queue (reviewer)
    pg.click("#btn-wallet"); pg.wait_for_timeout(300)
    pg.locator("#o-wallet button", has_text="Sign out").click(); pg.wait_for_timeout(250)
    pg.locator("#o-wallet button", has_text="Chị Phạm — reviewer").click(); pg.wait_for_timeout(400)
    pg.goto(BASE + "/#/review"); pg.wait_for_timeout(500)
    shot(pg, "07-review")

    # 8. Dashboard (buyer, after purchase)
    pg.click("#btn-wallet"); pg.wait_for_timeout(300)
    pg.locator("#o-wallet button", has_text="Sign out").click(); pg.wait_for_timeout(250)
    pg.locator("#o-wallet button", has_text="Bình Lê — buyer").click(); pg.wait_for_timeout(400)
    pg.goto(BASE + "/#/dashboard"); pg.wait_for_timeout(500)
    shot(pg, "08-dashboard")

    # 9. Strategy
    pg.goto(BASE + "/#/strategy"); pg.wait_for_timeout(500)
    shot(pg, "09-strategy", full=True)

    # 10. Mobile market (375px)
    pg.set_viewport_size({"width": 375, "height": 800})
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(600)
    shot(pg, "10-mobile")

    # Frames for the animated purchase demo (video-like, 6 frames)
    pg.set_viewport_size({"width": 1280, "height": 800})
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    pg.locator(".grid.assets .card").first.click(); pg.wait_for_timeout(400)
    pg.click("#btn-wallet"); pg.wait_for_timeout(300)
    pg.locator("#o-wallet button", has_text="Bình Lê — buyer").click(); pg.wait_for_timeout(400)
    pg.locator("#screen button.btn.accent", has_text="Buy license").first.click(); pg.wait_for_timeout(400)
    for i in range(1, 7):
        if i == 2:
            pg.locator("#screen button.btn.accent", has_text="Confirm payment").click()
        pg.wait_for_timeout(520)
        shot(pg, f"frame-{i}")
    b.close()

print("done")
