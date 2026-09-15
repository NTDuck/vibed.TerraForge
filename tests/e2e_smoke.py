"""E2E smoke: full buyer/creator/reviewer journeys on the TerraForge mockup."""
import json, os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TF_BASE", "http://localhost:5173")
CHROMIUM = "/nix/store/ds6wq0gzyimhl7c1kmzdvql0w4d2rcv4-chromium-153.0.8010.36/bin/chromium"
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

def body(pg):
    return pg.locator("#screen").inner_text()

def screen(pg):
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(400)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)

def upload_asset(pg, name, similarity=None, roblox=False, display_url=None, gallery_url=None):
    """Creator-only: fill the upload form and submit. Submit navigates to the asset page."""
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    pg.fill("#screen input[type='text']", name)
    if similarity is not None:
        pg.locator("#screen input[type='range']").first.evaluate(
            "v => { v.value = arguments0; v.dispatchEvent(new Event('input', {bubbles: true})); }"
            .replace("arguments0", str(similarity)))
    if not roblox:
        pg.locator("#screen input[type='checkbox']").nth(4).uncheck()
    if display_url:
        pg.locator("#screen input[placeholder='https://… or leave empty']").fill(display_url)
    if gallery_url:
        pg.locator("#screen textarea[placeholder='https://… one per line']").fill(gallery_url)
    pg.locator("#screen button", has_text="Submit").first.click(); pg.wait_for_timeout(700)

def run_compat(pg):
    """Newest upload's compat card: run the check and wait for the 600ms engine pass."""
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    pg.locator("#screen button", has_text="Run Compatibility check").first.click()
    pg.wait_for_timeout(400)
    pg.wait_for_timeout(2000)

def upload_row(pg, name):
    return pg.evaluate("""(name) => {
      const rows = [...document.querySelectorAll('#screen .card')]
        .filter(c => c.textContent.includes(name) && !c.textContent.includes('Compatibility passport'));
      const r = rows[rows.length - 1];
      if (!r) return null;
      const btn = [...r.querySelectorAll('button')].find(b => b.textContent === 'Mint');
      return { exists: true, mintPresent: !!btn, mintDisabled: btn ? btn.disabled : null,
               imgs: [...r.querySelectorAll('img')].map(i => i.getAttribute('src')) };
    }""", name)

def buy_tier(pg, card_index):
    pg.locator("#screen button", has_text="Buy license").nth(card_index).click()
    pg.wait_for_timeout(300)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # ---- 1. fresh seed market ----
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(400)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(700)
    check("market h1 text", pg.locator("h1").first.inner_text() == "TerraForge market",
          pg.locator("h1").first.inner_text())
    cards = pg.locator(".grid.assets .card")
    check("2 asset cards seeded", cards.count() == 2, f"got {cards.count()}")
    card_imgs = pg.locator(".grid.assets .card img")
    check("gallery images in cards", card_imgs.count() >= 4, f"got {card_imgs.count()}")
    check("card gallery srcs serve", all(pg.evaluate(
        "s => fetch(s, {method:'HEAD'}).then(r => r.ok)",
        card_imgs.nth(i).get_attribute("src")) for i in range(min(2, card_imgs.count()))))

    # ---- 2. theme picker ----
    sel = pg.locator("#theme-select")
    check("theme select exists", sel.count() == 1)
    check("theme 340 options", sel.locator("option").count() >= 340, f"got {sel.locator('option').count()}")
    sel.select_option("flexoki-dark"); pg.wait_for_timeout(300)
    check("flexoki-dark applied", pg.evaluate("document.documentElement.getAttribute('data-theme')") == "flexoki-dark")
    sel.select_option("flexoki-light"); pg.wait_for_timeout(300)
    check("flexoki-light restored", pg.evaluate("document.documentElement.getAttribute('data-theme')") == "flexoki-light")

    # ---- 3. asset detail signed out ----
    cards.first.click(); pg.wait_for_timeout(400)
    accs = pg.locator("#screen .acc")
    check("4 accordion blocks", accs.count() == 4, f"got {accs.count()}")
    accs.nth(3).locator(".acc-head").click(); pg.wait_for_timeout(300)
    chain = pg.locator("#screen .acc").nth(3)
    chain_txt = chain.inner_text()
    check("chain block has CRED-001", "CRED-001" in chain_txt)
    check("chain block has Polygon", "Polygon" in chain_txt)
    addr_n = chain.locator(".addr").count()
    check("addr buttons present", addr_n >= 2, f"got {addr_n}")
    chain.locator(".addr").first.click(); pg.wait_for_timeout(400)
    led = pg.locator("#o-ledger")
    check("addr opens SERSE ledger", "SERSE Audit Ledger" in led.inner_text())
    check("ledger first row now", led.locator("tr.now").count() >= 1 or led.locator("tbody tr").count() == 0,
          f"rows={led.locator('tbody tr').count()}")
    esc(pg)
    check("escape closes ledger", led.locator(".panel").count() == 0)

    # ---- 4. buyer purchases Hue Standard ----
    open_wallet(pg)
    pg.locator("#o-wallet button", has_text="Bình Lê — buyer").click(); pg.wait_for_timeout(400)
    check("wallet shows buyer balance", "9.800.000" in pg.locator("#btn-wallet").inner_text(),
          pg.locator("#btn-wallet").inner_text())
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(400)
    pg.locator(".grid.assets .card").first.click(); pg.wait_for_timeout(400)
    buy_tier(pg, 0)
    check("purchase steps rail", pg.locator("#screen .steps").count() == 1)
    check("steps rail order", pg.evaluate("[...document.querySelectorAll('#screen .step')].map(s=>s.textContent)")
          == ["summary", "paying", "verifying", "issuing"])
    pg.locator("#screen button", has_text="Confirm payment").click(); pg.wait_for_timeout(3000)
    btxt = body(pg)
    check("done banner license issued", "License issued" in btxt, btxt[-250:])
    check("serial #1 shown", "Serial" in btxt and "#1" in btxt, btxt[-250:])
    check("splits 1.710.000 + 190.000", "1.710.000" in btxt and "190.000" in btxt, btxt[-250:])
    pg.locator("#screen button", has_text="Close").click(); pg.wait_for_timeout(300)

    # ---- 4b. buyer purchases Hue Studio (for the resale story) ----
    buy_tier(pg, 1)
    check("studio checkout opens", "Checkout — Studio License" in body(pg))
    pg.locator("#screen button", has_text="Confirm payment").click(); pg.wait_for_timeout(3000)
    check("studio license issued", "License issued" in body(pg))
    pg.locator("#screen button", has_text="Close").click(); pg.wait_for_timeout(300)

    # ---- 5. double-license revert ----
    buy_tier(pg, 0)
    pg.locator("#screen button", has_text="Confirm payment").click(); pg.wait_for_timeout(3000)
    btxt = body(pg)
    check("double-license revert", "already hold" in btxt.lower(), btxt[-250:])

    # ---- 6. declined payment path via checkbox ----
    pg.locator("#screen button", has_text="Retry").click(); pg.wait_for_timeout(300)
    buy_tier(pg, 0)
    pg.locator("#screen input[type='checkbox']").check()
    pg.locator("#screen button", has_text="Confirm payment").click(); pg.wait_for_timeout(1600)
    btxt = body(pg)
    check("declined payment failed step", "declined" in btxt.lower(), btxt[-250:])
    pg.locator("#screen button", has_text="Retry").click(); pg.wait_for_timeout(300)
    check("retry restores tiers", pg.locator("#screen button", has_text="Buy license").count() >= 1)

    # ---- 7. SERSE ledger overlay ----
    esc(pg)
    pg.click("#btn-ledger"); pg.wait_for_timeout(400)
    led = pg.locator("#o-ledger")
    led_txt = led.inner_text()
    check("ledger title", "SERSE Audit Ledger" in led_txt)
    check("ledger now row", led.locator("tr.now").count() == 1, f"got {led.locator('tr.now').count()}")
    check("ledger on-chain chip", led.locator(".chip", has_text="on-chain").count() >= 1)
    check("ledger revert row", led.locator("tr.reverted").count() >= 1, led_txt[:200])
    check("ledger off-chain row", led.locator(".chip", has_text="off-chain").count() >= 1)
    esc(pg)

    # ---- 8. creator upload happy path (machine-verified + compat verified + mint) ----
    switch_persona(pg, "An Trần — creator")
    upload_asset(pg, "Test kit QA")  # defaults: sim 22 / trace 92, Roblox unchecked → all compat criteria pass
    atxt = body(pg)
    check("verdict machine-verified", "AI verified" in atxt or "machine-verified" in atxt.lower(), atxt[:300])
    run_compat(pg)
    check("compat criteria render", pg.locator("#screen .crit").count() >= 4,
          f"rows={pg.locator('#screen .crit').count()}")
    fail_n = pg.locator("#screen .crit.fail").count()
    check("compat criteria pass", pg.locator("#screen .crit.pass").count() >= 4 and fail_n == 0,
          f"pass={pg.locator('#screen .crit.pass').count()} fail={fail_n}")
    check("compat verified chip", "Compatibility Verified" in body(pg))
    row = upload_row(pg, "Test kit QA")
    check("mint button enabled", row and row["mintPresent"] and not row["mintDisabled"], str(row))
    pg.locator("#screen .card", has_text="Test kit QA").filter(has_text="not minted").last.locator("button", has_text="Mint").click(); pg.wait_for_timeout(700)
    check("mint yields SNG #", "SNG #" in body(pg), body(pg)[:300])

    # ---- 9. creator upload with pasted display URL ----
    upload_asset(pg, "URL kit QA", display_url="/img/assets/hue-2.webp", gallery_url="/img/assets/hue-3.webp")
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    row = upload_row(pg, "URL kit QA")
    check("upload row shows display img", row and any("hue-2.webp" in (s or "") for s in row["imgs"]),
          str(row and row["imgs"]))
    gate_title = pg.evaluate("""(() => {
      const rows = [...document.querySelectorAll('#screen .card')]
        .filter(c => c.textContent.includes('URL kit QA') && c.textContent.includes('not minted'));
      const btn = [...rows[rows.length - 1].querySelectorAll('button')].find(b => b.textContent === 'Mint');
      return btn ? btn.title : '';
    })()""")
    check("mint gate hint", "Both layers must verify" in gate_title or "Both layers must pass" in gate_title,
          gate_title)

    # ---- 10. borderline upload (similarity 35) needs review, compat passes, mint stays gated ----
    upload_asset(pg, "Borderline asset QA", similarity=35, display_url="/img/assets/hue-2.webp")
    vtxt = body(pg)
    check("borderline needs review", "Human review required" in vtxt or "review" in vtxt.lower(), vtxt[:300])
    st = pg.evaluate("""(() => {
      const a = JSON.parse(localStorage['terraforge-mock-v1']).assets.at(-1);
      return { v: a.verification.status, compat: a.verification.compat.status };
    })()""")
    run_compat(pg)
    st2 = pg.evaluate("""(() => {
      const a = JSON.parse(localStorage['terraforge-mock-v1']).assets.at(-1);
      return { v: a.verification.status, compat: a.verification.compat.status };
    })()""")
    check("borderline compat verified", st2["compat"] == "verified", str(st2))
    check("borderline still needs review", st2["v"] == "needs-review", str(st2))
    row = upload_row(pg, "Borderline asset QA")
    check("borderline mint gated", row and not row["mintPresent"], str(row))

    # ---- 11. reviewer approves the borderline asset ----
    switch_persona(pg, "Chị Phạm — reviewer")
    pg.goto(BASE + "/#/review"); pg.wait_for_timeout(400)
    queue_card = pg.locator("#screen .card", has_text="Borderline asset QA")
    check("reviewer queue card", queue_card.count() == 1, f"got {queue_card.count()}")
    qtxt = queue_card.first.inner_text()
    check("queue card shows gallery", queue_card.first.locator("img").count() >= 1, qtxt[:150])
    check("queue card shows spec", "Triangles" in qtxt, qtxt[:150])
    check("queue card shows findings", "Compatibility findings" in qtxt, qtxt[:200])
    queue_card.first.locator("textarea").fill("Cultural motifs verified with artisan sources.")
    queue_card.first.locator("button", has_text="Approve").click(); pg.wait_for_timeout(600)
    check("approve recorded", "Approved" in body(pg), body(pg)[:300])

    # ---- 12. creator mints the approved asset ----
    switch_persona(pg, "An Trần — creator")
    pg.goto(BASE + "/#/upload"); pg.wait_for_timeout(400)
    row = upload_row(pg, "Borderline asset QA")
    borderline_row = pg.locator("#screen .card", has_text="Borderline asset QA").filter(has_text="not minted").last
    borderline_row.locator("button", has_text="Mint").click(); pg.wait_for_timeout(700)
    toks = pg.evaluate("JSON.parse(localStorage['terraforge-mock-v1']).assets.filter(a => a.tokenId).map(a => a.tokenId)")
    check("borderline token minted", len(toks) == 4 and toks[-1].startswith("SNG #"), str(toks))

    # ---- 13. resale story: Binh resells Hue Studio to Minh, Minh hits the limit ----
    switch_persona(pg, "Bình Lê — buyer")
    pg.goto(BASE + "/#/dashboard"); pg.wait_for_timeout(400)
    studio_card = pg.locator("#screen .card", has_text="Studio License").filter(has_text="Serial").first
    check("binh holds studio license", studio_card.count() == 1, body(pg)[:200])
    transfer_sel = studio_card.locator("select[aria-label='Transfer license to']")
    check("transfer select present", transfer_sel.count() == 1)
    check("transfer default Minh", transfer_sel.input_value() == "u-minh", transfer_sel.input_value())
    minh_id = pg.evaluate("JSON.parse(localStorage['terraforge-mock-v1']).users['u-minh'].id")
    transfer_sel.select_option(minh_id); pg.wait_for_timeout(200)
    check("dynamic transfer label", studio_card.locator("button", has_text="Transfer to Minh Vũ").count() == 1)
    studio_card.locator("input[type='number']").fill("1000000")  # Minh holds 6.400.000₫; tier default 7.600.000₫
    studio_card.locator("button", has_text="Transfer to Minh Vũ").click(); pg.wait_for_timeout(700)
    toasts = pg.locator("#o-toasts .toast").all_inner_texts()
    check("resale success toast", any("transferred to Minh Vũ" in t for t in toasts), str(toasts))
    royalty = pg.evaluate("""(() => {
      const s = JSON.parse(localStorage['terraforge-mock-v1']);
      const sale = s.sales.at(-1);
      return { primary: sale.primary, royalty: sale.splits.find(sp => sp.kind === 'royalty')?.vnd };
    })()""")
    check("resale royalty 10% to creator", royalty and not royalty["primary"] and royalty["royalty"] == 100000, str(royalty))
    switch_persona(pg, "Minh Vũ — buyer")
    pg.goto(BASE + "/#/dashboard"); pg.wait_for_timeout(400)
    minh_card = pg.locator("#screen .card", has_text="Studio License").filter(has_text="Serial").first
    check("minh holds studio license", minh_card.count() == 1, body(pg)[:200])
    minh_sel = minh_card.locator("select[aria-label='Transfer license to']")
    an_id = pg.evaluate("JSON.parse(localStorage['terraforge-mock-v1']).users['u-an'].id")
    minh_sel.select_option(an_id); pg.wait_for_timeout(200)
    minh_card.locator("button", has_text="Transfer to An Trần").click(); pg.wait_for_timeout(700)
    toasts = pg.locator("#o-toasts .toast").all_inner_texts()
    check("resale limit revert", any("resale limit reached" in t for t in toasts), str(toasts))
    revert_tx = pg.evaluate("""(() => {
      const s = JSON.parse(localStorage['terraforge-mock-v1']);
      return s.txs.filter(t => t.status === 'reverted').map(t => t.call?.revert).join('|');
    })()""")
    check("revert row in ledger", "resaleLimitReached" in revert_tx, revert_tx)

    # ---- 14. creator as buyer: Bat Trang + usage checker ----
    switch_persona(pg, "An Trần — creator")
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(400)
    pg.locator(".grid.assets .card").nth(1).click(); pg.wait_for_timeout(400)
    buy_tier(pg, 0)
    pg.locator("#screen button", has_text="Confirm payment").click(); pg.wait_for_timeout(3000)
    check("an buys bat trang", "License issued" in body(pg))
    pg.locator("#screen button", has_text="Close").click(); pg.wait_for_timeout(300)
    pg.goto(BASE + "/#/dashboard"); pg.wait_for_timeout(400)
    dtxt = body(pg)
    check("creator dashboard my licenses", "My licenses" in dtxt, dtxt[:200])
    bat_card = pg.locator("#screen .card", has_text="Bat Trang").filter(has_text="Serial").first
    check("bat trang license card", bat_card.count() == 1, dtxt[:250])
    usage_sel = bat_card.locator("select[aria-label='Usage to check']")
    check("usage select present", usage_sel.count() == 1)
    usage_sel.select_option("commercial"); pg.wait_for_timeout(200)
    bat_card.locator("button", has_text="Check permit").click(); pg.wait_for_timeout(500)
    check("commercial permitted", any("PERMITTED" in t for t in pg.locator("#o-toasts .toast").all_inner_texts()))
    bat_card.locator(".chip", has_text="Permitted").wait_for(timeout=2000)
    check("permitted verdict chip", bat_card.locator(".chip", has_text="Permitted").count() >= 1)
    usage_sel.select_option("resale"); pg.wait_for_timeout(200)
    bat_card.locator("button", has_text="Check permit").click(); pg.wait_for_timeout(500)
    toasts = pg.locator("#o-toasts .toast").all_inner_texts()
    check("resale not permitted", any("REVERTED" in t for t in toasts), str(toasts))
    usage_led = pg.evaluate("""(() => {
      const s = JSON.parse(localStorage['terraforge-mock-v1']);
      return s.txs.slice(0, 2).map(t => t.kind + ':' + t.status).join('|');
    })()""")
    check("usage revert in ledger", "usage:reverted" in usage_led, usage_led)

    # ---- 15. smart contracts screen ----
    pg.locator("#nav a", has_text="Smart contracts").click(); pg.wait_for_timeout(400)
    ctxt = body(pg)
    check("contracts h1", "Smart contracts" in ctxt)
    check("three contract cards", pg.locator("#screen .grid.three .card").count() == 3,
          f"got {pg.locator('#screen .grid.three .card').count()}")
    for name in ("GameAssetRegistry", "LicenseIssuer", "LicenseEnforcer"):
        check(f"contract {name}", name in ctxt)
    pg.locator("#screen button", has_text="Open SERSE Audit Ledger").click(); pg.wait_for_timeout(400)
    check("contracts ledger button works", "SERSE Audit Ledger" in pg.locator("#o-ledger").inner_text())
    esc(pg)

    # ---- 16. strategy needles ----
    pg.locator("#nav a", has_text="Strategy").click(); pg.wait_for_timeout(400)
    stxt = body(pg)
    for needle in ("Integrated strategy", "ON-CHAIN", "OFF-CHAIN", "Limitations", "Y0", "royalt"):
        check(f"strategy has {needle}", needle.lower() in stxt.lower())

    # ---- 17. rebrand ----
    check("title has TerraForge", "TerraForge" in pg.title(), pg.title())
    logo = pg.locator(".logo").inner_text()
    check("logo Terra + Forge", "Terra" in logo and "Forge" in logo, logo)
    check("footer INTE2581", "INTE2581" in pg.locator("footer").inner_text())

    # ---- 18. responsive 375px ----
    pg.set_viewport_size({"width": 375, "height": 800})
    pg.goto(BASE + "/#/market"); pg.wait_for_timeout(400)
    h_scroll = pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    check("no horizontal scroll at 375px", not h_scroll,
          f"scrollW={pg.evaluate('document.documentElement.scrollWidth')}")
    pg.set_viewport_size({"width": 1280, "height": 900})

    # ---- 19. no JS errors across the run ----
    check("no JS page errors", len(errors) == 0, "; ".join(errors[:4]))
    b.close()

fails = [r for r in results if not r[1]]
print(json.dumps({"pass": len(results) - len(fails), "fail": len(fails)}, indent=0))
for name, ok, extra in fails:
    print("FAIL:", name, "|", extra[:250])
sys.exit(1 if fails else 0)
