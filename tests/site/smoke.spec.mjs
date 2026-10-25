// SPDX-License-Identifier: MIT
// Browser smoke test (CLAUDE.md rule 23): every published page loads in both themes with zero console
// errors and no failed same-origin requests, every same-origin link and #anchor resolves, and the
// shared runtime (search, theme, sidebar) and every engine work. External requests (Google Fonts)
// are blocked so the test never depends on the network.
import { test, expect } from "@playwright/test";

const SITE = "/site/";

/** Open a page with network isolation and error collection; returns {page, problems}. */
async function open(browser, url, colorScheme = "dark") {
  const context = await browser.newContext({ colorScheme });
  const page = await context.newPage();
  const problems = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const src = (m.location() && m.location().url) || "";
    if (src && !src.startsWith("http://127.0.0.1")) return; // blocked external resource
    if (/fonts\.(googleapis|gstatic)\.com/.test(m.text())) return;
    problems.push(`console: ${m.text()} (${src})`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (r.url().startsWith("http://127.0.0.1")) problems.push(`requestfailed: ${r.url()}`); });
  page.on("response", (r) => { if (r.url().startsWith("http://127.0.0.1") && r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(150);
  return { page, context, problems };
}

/** All pages that should exist: the landing page plus every SITE entry with status "ready". */
async function publishedPages(browser) {
  const { page, context } = await open(browser, SITE + "index.html");
  const files = await page.evaluate(() => window.MCU.SITE.filter((p) => p.status === "ready").map((p) => p.file));
  await context.close();
  return ["index.html", ...files];
}

test("every published page loads cleanly in both themes", async ({ browser }) => {
  const pages = await publishedPages(browser);
  expect(pages.length).toBeGreaterThan(1);
  test.setTimeout(pages.length * 2 * 5_000);   // grows with the site: ~5 s budget per page and theme
  for (const file of pages) {
    for (const scheme of ["dark", "light"]) {
      const { page, context, problems } = await open(browser, SITE + file, scheme);
      await expect(page.locator("header.site-header"), `${file}: header`).toBeVisible();
      await expect(page.locator("footer.site-footer"), `${file}: footer`).toBeAttached();
      if (file !== "index.html") {
        await expect(page.locator("#sidebar .sb-page.current"), `${file}: sidebar marks the current page`).toHaveCount(1);
        await expect(page.locator("section#references .ref-item").first(), `${file}: references rendered`).toBeAttached();
      }
      expect(problems, `${file} (${scheme})`).toEqual([]);
      await context.close();
    }
  }
});

test("every same-origin link and anchor resolves", async ({ browser, request }) => {
  const pages = await publishedPages(browser);
  test.setTimeout(Math.max(60_000, pages.length * 4_000));
  const anchorsByPage = {};
  const targets = new Map();
  for (const file of pages) {
    const { page, context } = await open(browser, SITE + file);
    anchorsByPage[file] = new Set(await page.$$eval("[id]", (els) => els.map((e) => e.id)));
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.href));
    for (const h of hrefs) {
      const u = new URL(h);
      if (u.origin !== "http://127.0.0.1:4173") continue;
      targets.set(h, file);
    }
    await context.close();
  }
  for (const [href, from] of targets) {
    const u = new URL(href);
    const res = await request.get(u.pathname);
    expect(res.status(), `${from} → ${u.pathname}`).toBe(200);
    if (u.hash && u.pathname.endsWith(".html")) {
      const file = u.pathname.split("/").pop();
      let ids = anchorsByPage[file];
      if (!ids) {
        const { page, context } = await open(browser, u.pathname);
        ids = new Set(await page.$$eval("[id]", (els) => els.map((e) => e.id)));
        await context.close();
      }
      expect(ids.has(decodeURIComponent(u.hash.slice(1))), `${from} → ${u.pathname}${u.hash}`).toBe(true);
    }
  }
});

test("global search finds glossary terms and Ctrl+K focuses it", async ({ browser }) => {
  const { page, context, problems } = await open(browser, SITE + "index.html");
  await page.keyboard.press("Control+k");
  await expect(page.locator("#gs-input")).toBeFocused();
  await page.keyboard.type("NVIC");
  const hit = page.locator(`#gs-results a[href$="glossary.html#g-nvic"]`).first();   // pages match too; pick the glossary hit
  await expect(hit).toBeVisible();
  await hit.click();
  await expect(page).toHaveURL(/glossary\.html#g-nvic$/);
  await expect(page.locator("#g-nvic")).toBeVisible();
  expect(problems).toEqual([]);
  await context.close();
});

test("theme toggle switches and persists", async ({ browser }) => {
  const { page, context } = await open(browser, SITE + "index.html", "dark");
  await page.click("#theme-btn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await context.close();
});

test("planned modules are shown but never linked", async ({ browser }) => {
  const { page, context } = await open(browser, SITE + "index.html");
  const planned = await page.evaluate(() => window.MCU.SITE.filter((p) => p.status === "planned").map((p) => p.file));
  for (const f of planned) await expect(page.locator(`a[href="${f}"]`)).toHaveCount(0);
  await expect(page.locator(".module-card.is-planned")).toHaveCount(planned.length);
  await context.close();
});

test("glossary filters by text and category", async ({ browser }) => {
  const { page, context, problems } = await open(browser, SITE + "glossary.html");
  const all = await page.locator(".gloss-item").count();
  expect(all).toBeGreaterThan(50);
  await page.fill("#g-search", "bxcan");
  const hits = page.locator(".gloss-item");
  await expect(hits).not.toHaveCount(all);
  const texts = await hits.allInnerTexts();
  expect(texts.length).toBeGreaterThan(1);                  // bxCAN itself + terms that mention it
  for (const t of texts) expect(t.toLowerCase()).toContain("bxcan");
  await page.fill("#g-search", "");
  await page.click('.gloss-cat[data-c="autosar"]');
  const n = await page.locator(".gloss-item").count();
  expect(n).toBeGreaterThan(5);
  expect(n).toBeLessThan(all);
  expect(problems).toEqual([]);
  await context.close();
});

test("engines render and respond (fixture page)", async ({ browser }) => {
  const { page, context, problems } = await open(browser, "/tests/site/fixtures/engines.html");
  // static code block: line numbers start at data-start and skip data-skip
  await expect(page.locator(".code-block").first().locator(".lno")).toHaveText(["10", "12"]);
  // registers/HAL switch
  await expect(page.locator(".lang-switch .tab-list button")).toHaveText(["Registers", "HAL"]);
  // annotated explorer
  await page.click('.ann-item[data-ann="2"]');
  await expect(page.locator('#explorer .cl.hl[data-ann="2"]')).toHaveCount(1);
  // sequence diagram
  await page.click('#seq-demo [data-act="next"]');
  await page.click('#seq-demo [data-act="next"]');
  await expect(page.locator("#seq-demo .seq-count")).toHaveText("2 / 3");
  await expect(page.locator("#seq-demo .sd-side .callout.analogy")).toBeVisible();
  // layered renderer: hovering a node lights its edge; RTE boundary crossing marker exists
  await expect(page.locator("#lg-demo .lg-cross")).toHaveCount(1);
  await page.hover('#lg-demo .lg-node[data-id="swc"]');
  await expect(page.locator("#lg-demo .lg-edge.lit")).toHaveCount(1);
  // pinout: wiring view drew parts; clicking a pin fills the side panel; search highlights
  await expect(page.locator("#po-demo .po-ext")).toHaveCount(3);
  await page.click('#po-demo [data-pin="PA9"] .po-dot');
  await expect(page.locator("#po-demo .po-panel .w-title")).toContainText("PA9");
  await page.fill("#po-demo .po-search", "CAN_TX");
  await expect(page.locator("#po-demo .po-pin.match")).toHaveCount(2);
  // register: the C expression follows the value; toggling a bit changes it
  await expect(page.locator("#reg-demo .reg-cexpr")).toHaveText("RCC->CFGR = RCC_CFGR_PLLMULL9 | RCC_CFGR_PLLSRC | RCC_CFGR_PPRE1_DIV2 | RCC_CFGR_SW_PLL;");
  await page.click('#reg-demo .reg-bit[data-bit="0"]');
  await expect(page.locator("#reg-demo .reg-hex")).toHaveText("0x001D0403");
  // memory map: stepping highlights .data in flash and RAM
  await page.click('#mm-demo [data-act="next"]');
  await page.click('#mm-demo [data-act="next"]');
  await expect(page.locator("#mm-demo .mm-sec.on")).toHaveCount(2);
  // checklist: ticking persists the count
  await page.check("#ck-demo input[data-i='1']");
  await expect(page.locator("#ck-demo .ck-count")).toHaveText("1 / 2");
  // waveform: CAN frame with field bands; clock tree flags an illegal APB1 and shows the latency
  await expect(page.locator("#wv-demo .wv-band").first()).toBeAttached();
  await expect(page.locator("#clk-demo .clk-okmsg")).toBeVisible();
  await page.selectOption('#clk-demo select[data-k="ppre1"]', "1");
  await expect(page.locator("#clk-demo .clk-viol li")).toHaveCount(1);
  // calculator: best CAN timing row is highlighted and reacts to input
  await expect(page.locator("#calc-demo .calc-best")).toHaveCount(1);
  await page.fill('#calc-demo input[data-k="bitrate"]', "250000");
  await expect(page.locator("#calc-demo .calc-best")).toHaveCount(1);
  // state machine: firing an event moves the current state
  await page.click('#sm-demo [data-fire="0"]');
  await expect(page.locator('#sm-demo .sm-s.cur')).toHaveAttribute("data-s", "on");
  // compare: two columns
  await expect(page.locator("#cmp-demo .cmp-col")).toHaveCount(2);
  expect(problems).toEqual([]);
  await context.close();
});
