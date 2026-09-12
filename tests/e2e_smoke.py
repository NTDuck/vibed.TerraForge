"""E2E smoke: full buyer/creator/reviewer journeys on the SenChain mockup."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
results = []

def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))

def esc(pg):
    pg.keyboard.press("Escape"); pg.wait_for_timeout(250)

def open_wallet(pg):
    esc(pg)
    pg.click("#btn-wallet"); pg.wait_for_timeout(300)

def switch_persona(pg, label):
    open_wallet(pg)
    pg.locator("#o-wallet button", has_text="Sign out").click(); pg.wait_for_timeout(250)
    pg.locator("#o-wallet button", has_text=label).click(); pg.wait_for_timeout(300)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/nix/store/789yhb4v2kq51jwl4acmmjvxs7mfrlhv-chromium-152.0.7977.75/bin/chromium", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # 1. market renders (fresh seed)
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(400)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    check("market renders", pg.locator("h1").first.inner_text() != "")
    cards = pg.locator(".grid.assets .card")
    check("5 seeded assets listed", cards.count() == 5, f"got {cards.count()}")

    # 2. asset detail gated while signed out
    pg.locator(".grid.assets .card").first.click(); pg.wait_for_timeout(400)
    check("asset detail shows tiers", pg.locator("text=Standard License").count() >= 1)
    check("buy gated when signed out", pg.get_by_text("Sign in as a buyer").count() >= 1)

    # 3. buyer purchases Standard tier
    open_wallet(pg)
    pg.locator("#o-wallet button", has_text="Bình Lê — buyer").click(); pg.wait_for_timeout(300)
    check("wallet shows buyer balance", "9.800.000" in pg.locator("#btn-wallet").inner_text())
    pg.locator("#screen button.btn.accent", has_text="Buy license").first.click(); pg.wait_for_timeout(400)
    check("purchase panel opens", pg.locator(".steps").count() == 1)
    pg.locator("#screen button.btn.accent", has_text="Confirm payment").click(); pg.wait_for_timeout(3000)
    body = pg.locator("#screen").inner_text()
    check("purchase done banner", "License issued" in body, body[-300:])
    check("license serial shown", "Serial #1" in body, body[-300:])
    check("splits shown 90/10", "1.710.000" in body and "190.000" in body, body[-300:])

    # 4. double-license revert
    pg.locator("#screen button", has_text="Close").click(); pg.wait_for_timeout(300)
    pg.locator("#screen button.btn.accent", has_text="Buy license").first.click(); pg.wait_for_timeout(300)
    pg.locator("#screen button.btn.accent", has_text="Confirm payment").click(); pg.wait_for_timeout(3000)
    body2 = pg.locator("#screen").inner_text()
    check("double-license blocked", "already hold" in body2.lower(), body2[-300:])

    # 5. declined payment path (fresh checkout: checkbox lives in the summary step)
    pg.locator("#screen button", has_text="Retry").click(); pg.wait_for_timeout(300)  # Retry resets purchase → tier list
    pg.locator("#screen button.btn.accent", has_text="Buy license").first.click(); pg.wait_for_timeout(300)
    pg.locator("#screen input[type='checkbox']").check()
    pg.locator("#screen button.btn.accent", has_text="Confirm payment").click(); pg.wait_for_timeout(1600)
    body2b = pg.locator("#screen").inner_text()
    check("declined payment failed step", "declined" in body2b.lower() or "failed" in body2b.lower(), body2b[-200:])
    pg.locator("#screen button", has_text="Retry").click(); pg.wait_for_timeout(300)

    # 6. ledger shows revert + issue + royalty + off-chain rows
    esc(pg)
    pg.click("#btn-ledger"); pg.wait_for_timeout(300)
    led = pg.locator("#o-ledger").inner_text()
    check("ledger open", "Transaction ledger" in led)
    check("ledger has on-chain chips", "on-chain" in led)
    check("ledger shows revert", "revert" in led.lower())
    check("ledger shows off-chain", "off-chain" in led)
    check("ledger shows royalty", "royalt" in led.lower())
    esc(pg)

    # 7. creator: upload machine-verified asset
    switch_persona(pg, "An Trần — creator")
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    check("upload guard ok (creator)", pg.get_by_text("How verification works").count() == 1)
    pg.fill("input[type='text']", "Test asset QA")
    pg.locator("#screen button", has_text="Submit").first.click(); pg.wait_for_timeout(700)
    body3 = pg.locator("#screen").inner_text()
    check("verdict machine-verified", "machine-verified" in body3.lower() or "ai verified" in body3.lower(), body3[:400])

    # 8. creator: upload fraudulent asset (similarity 62 → auto-reject)
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    pg.fill("input[type='text']", "Fraud asset QA")
    pg.locator("#screen input[type='range']").first.evaluate("el => { el.value = 62; el.dispatchEvent(new Event('input', {bubbles: true})); }")
    pg.locator("#screen button", has_text="Submit").first.click(); pg.wait_for_timeout(700)
    body4 = pg.locator("#screen").inner_text()
    check("fraud rejected at 62%", "reject" in body4.lower(), body4[:400])

    # 9. creator: upload borderline asset (35 → needs review), then reviewer approves
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    pg.fill("input[type='text']", "Borderline asset QA")
    pg.locator("#screen input[type='range']").first.evaluate("el => { el.value = 35; el.dispatchEvent(new Event('input', {bubbles: true})); }")
    pg.locator("#screen button", has_text="Submit").first.click(); pg.wait_for_timeout(700)
    body5 = pg.locator("#screen").inner_text()
    check("borderline needs review", "review" in body5.lower(), body5[:300])

    switch_persona(pg, "Chị Phạm — reviewer")
    pg.goto(BASE + "/#/review"); pg.wait_for_timeout(400)
    queue_card = pg.locator("#screen .card", has_text="Borderline asset QA")
    check("reviewer queue has borderline", queue_card.count() >= 1)
    queue_card.locator("textarea").fill("Cultural motifs verified with artisan sources.")
    queue_card.locator("button", has_text="Approve").click(); pg.wait_for_timeout(500)
    body6 = pg.locator("#screen").inner_text()
    check("review approved recorded", "Approved" in body6, body6[:300])

    # 10. creator mints the approved asset
    switch_persona(pg, "An Trần — creator")
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    mint_btn = pg.locator("#screen button", has_text="Mint").first
    check("mint button available", mint_btn.count() >= 1)
    mint_btn.click(); pg.wait_for_timeout(600)
    body7 = pg.locator("#screen").inner_text()
    check("mint recorded token id", "SNG #" in body7, body7[:400])

    # 11. dashboard: buyer usage checker + creator royalties
    switch_persona(pg, "Bình Lê — buyer")
    pg.goto(BASE + "/#/dashboard"); pg.wait_for_timeout(400)
    dash = pg.locator("#screen").inner_text()
    check("buyer dashboard shows license", "Ronin of Đống Đa" in dash, dash[:300])
    check("usage checker present", "Usage" in dash or "permit" in dash.lower(), dash[:300])
    # run a permitted usage check (commercial on Standard = allowed)
    pg.locator("#screen button", has_text="Check permit").first.click(); pg.wait_for_timeout(400)
    # switch usage to resale (not permitted) and check again
    sel = pg.locator("#screen select").first
    sel.select_option("resale"); pg.wait_for_timeout(200)
    pg.locator("#screen button", has_text="Check permit").first.click(); pg.wait_for_timeout(400)
    led2 = pg.evaluate("JSON.parse(localStorage['senchain-mock-v1']).txs.slice(0,3).map(t=>t.kind+':'+t.status).join('|')")
    check("usage permit + revert in ledger", "usage" in led2 and "reverted" in led2, led2)

    # 12. strategy screen content
    pg.goto(BASE + "/#/strategy"); pg.wait_for_timeout(400)
    strat = pg.locator("#screen").inner_text()
    for needle in ["Integrated strategy", "ON-CHAIN", "OFF-CHAIN", "Limitations", "Y0", "royalt"]:
        check(f"strategy has {needle}", needle.lower() in strat.lower())

    # 13. responsive smoke at 375px
    pg.set_viewport_size({"width": 375, "height": 800})
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(400)
    h_scroll = pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    check("no horizontal scroll at 375px", not h_scroll, f"scrollW={pg.evaluate('document.documentElement.scrollWidth')}")

    check("no JS errors", len(errors) == 0, "; ".join(errors[:4]))
    b.close()

fails = [r for r in results if not r[1]]
print(json.dumps({"pass": len(results) - len(fails), "fail": len(fails)}, indent=0))
for name, ok, extra in fails:
    print("FAIL:", name, "|", extra[:250])
sys.exit(1 if fails else 0)
