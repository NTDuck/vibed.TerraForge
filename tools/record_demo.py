"""Record an introductory screencast (webm) of the core SenChain purchase journey."""
import os
import pathlib
import shutil
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:5173")
OUT = pathlib.Path("docs/img")
OUT.mkdir(parents=True, exist_ok=True)
VIDEO_DIR = pathlib.Path("/tmp/senchain_video")
VIDEO_DIR.mkdir(exist_ok=True)
CHROME = sorted(pathlib.Path("/nix/store").glob("*-chromium-*/bin/chromium"))[-1]

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=str(CHROME), args=["--no-sandbox"])
    ctx = b.new_context(
        viewport={"width": 1280, "height": 800},
        record_video_dir=str(VIDEO_DIR),
        record_video_size={"width": 1280, "height": 800},
    )
    pg = ctx.new_page()

    # Market with fresh seed
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(1200)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1200)

    # Sign in as the buyer
    pg.click("#btn-wallet"); pg.wait_for_timeout(600)
    pg.locator("#o-wallet button", has_text="Bình Lê — buyer").click(); pg.wait_for_timeout(800)

    # Open the asset and start checkout
    pg.locator(".grid.assets .card").first.click(); pg.wait_for_timeout(900)
    pg.locator("#screen button.btn.accent", has_text="Buy license").first.click(); pg.wait_for_timeout(1000)

    # Pay → verify → issue (the 4-step journey)
    pg.locator("#screen button.btn.accent", has_text="Confirm payment").click()
    pg.wait_for_timeout(3600)

    # License issued panel with splits
    pg.wait_for_timeout(1200)

    # Ledger showing the on-chain records
    pg.click("#btn-ledger"); pg.wait_for_timeout(1400)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)

    # Dashboard with the license NFT
    pg.goto(BASE + "/#/dashboard"); pg.wait_for_timeout(1200)

    ctx.close()  # finalizes the video file
    b.close()

videos = list(VIDEO_DIR.glob("*.webm"))
if videos:
    target = OUT / "demo-raw.webm"
    shutil.move(str(videos[-1]), target)
    print("saved", target)
else:
    print("no video produced")
