const { launchBrowser } = require("./browser.cjs");
const assert = require("node:assert/strict");
const AxeBuilder = require("@axe-core/playwright").default;
(async () => {
  const b = await launchBrowser();
  try {
    const context = await b.newContext({
      viewport: { width: 1366, height: 768 },
      locale: "pt-BR",
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:4173/index.html");
    assert.ok(
      await p.evaluate(
        () =>
          document.getElementById("profile-button").getBoundingClientRect()
            .bottom <= innerHeight,
      ),
    );
    await p.screenshot({ path: "test-results/index-1366.png" });
    for (const file of [
      "index",
      "pacientes",
      "triagem",
      "fila",
      "atendimentos",
      "equipe",
      "relatorios",
    ]) {
      await p.setViewportSize({ width: 320, height: 700 });
      await p.goto("http://localhost:4173/" + file + ".html");
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        file + " em 320px",
      );
    }
    console.log(
      "✓ Menu inteiro em 1366×768 e sete páginas sem transbordamento em 320px",
    );
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.goto("http://localhost:4173/triagem.html?patient=patient_015");
    await p.locator("[data-triage-form] button[type=submit]").click();
    const audit = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await p.locator("input[name=risk][value=red]").check();
    await p.locator("#clinical-professional").selectOption("staff_01");
    await p
      .locator("#clinical-rationale")
      .fill(
        "Cenário fictício para testar o encaminhamento imediato confirmado.",
      );
    await p.locator("[data-triage-form] button[type=submit]").click();
    await p.locator("input[name=destination][value=attending]").check();
    await p.locator("input[name=confirmed]").check();
    await p.locator("[data-triage-form] button[type=submit]").click();
    assert.equal(
      await p.evaluate(() => Store.patient("patient_015").status),
      "attending",
    );
    console.log(
      "✓ Etapa de avaliação acessível e encaminhamento direto confirmado para emergência",
    );
    await p.goto("http://localhost:4173/relatorios.html");
    await p.locator('[data-period="30"]').click();
    await p.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.evaluate(() => {
      window.print = () => {
        window.__printedRows = document.querySelectorAll(
          ".mg-report-table tbody tr",
        ).length;
      };
    });
    await p.locator("#mg-print-report").click();
    assert.equal(await p.evaluate(() => window.__printedRows), 84);
    await p.locator("#mg-toggle-records").click();
    await p.emulateMedia({ media: "print" });
    assert.equal(await p.locator(".mg-patient-link").first().isVisible(), true);
    await p.pdf({
      path: "test-results/relatorio-exemplo.pdf",
      format: "A4",
      printBackground: true,
    });
    console.log(
      "✓ Relatório de 30 dias e impressão de todos os registros com nomes visíveis",
    );
    await p.emulateMedia({ media: "screen" });
    await p.goto(
      "file:///" + process.cwd().replace(/\\/g, "/") + "/index.html",
    );
    await p.waitForSelector("h1");
    assert.equal(await p.locator(".stat-card").count(), 4);
    console.log("✓ Abertura direta por index.html sem servidor");
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
