const { launchBrowser } = require("./browser.cjs");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  fs.mkdirSync("test-results", { recursive: true });
  const results = [];
  for (const file of [
    "index",
    "pacientes",
    "triagem",
    "fila",
    "atendimentos",
    "equipe",
    "relatorios",
  ]) {
    await page.goto("http://localhost:4173/" + file + ".html");
    await page.waitForSelector("h1");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: "test-results/" + file + "-desktop.png",
      fullPage: true,
    });
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    results.push({
      file,
      title: await page.locator("h1").innerText(),
      errors: [...errors],
      violations: report.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes
          .map((n) => ({ target: n.target, summary: n.failureSummary }))
          .slice(0, 30),
      })),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "test-results/" + file + "-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    results[results.length - 1].mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  fs.writeFileSync(
    "test-results/inspection.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify(
      results.map((r) => ({
        file: r.file,
        errors: r.errors,
        violations: r.violations.map((v) => ({
          id: v.id,
          count: v.nodes.length,
        })),
        mobileOverflow: r.mobileOverflow,
      })),
      null,
      2,
    ),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
