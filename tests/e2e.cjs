const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { launchBrowser } = require("./browser.cjs");
const AxeBuilder = require("@axe-core/playwright").default;
const base = "http://localhost:" + (process.env.PORT || 4173);
let server, browser;
const checks = [];
const pass = (name) => {
  checks.push(name);
  console.log("✓ " + name);
};
async function startServer() {
  try {
    await fetch(base);
    return;
  } catch {}
  server = spawn(process.execPath, ["server.cjs", process.env.TEST_STATIC_ROOT || "."], {
    cwd: path.join(__dirname, ".."),
    stdio: "ignore",
    windowsHide: true,
  });
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(base);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Não foi possível iniciar o servidor de teste.");
}
(async () => {
  await startServer();
  browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  fs.mkdirSync("test-results", { recursive: true });
  for (const file of [
    "index",
    "pacientes",
    "triagem",
    "fila",
    "atendimentos",
    "equipe",
    "relatorios",
  ]) {
    await page.goto(base + "/" + file + ".html");
    await page.waitForSelector("h1");
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator(".nav-item[aria-current=page]").count(), 1);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      file + ": auditoria de acessibilidade",
    );
    await page.screenshot({
      path: "test-results/" + file + "-desktop.png",
      fullPage: true,
    });
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        file + ": largura " + width,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "test-results/" + file + "-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  pass(
    "7 páginas: renderização, links ativos, ausência de erros, contraste e layout em 390/768/1440 px",
  );
  await page.goto(base + "/pacientes.html");
  await page
    .getByRole("button", { name: "Novo paciente", exact: true })
    .click();
  await page.locator("#patient-name").fill("Marina Teste de Acolhimento");
  await page.locator("#patient-birth").fill("1995-04-12");
  await page
    .locator("#patient-complaint")
    .fill("Consulta de demonstração para testar o acolhimento.");
  await page.locator("#patient-allergies").fill("Não informado");
  await page
    .getByRole("button", { name: "Cadastrar paciente", exact: true })
    .click();
  const patient = await page.evaluate(() =>
    Store.patients().find((p) => p.name === "Marina Teste de Acolhimento"),
  );
  assert.equal(patient.status, "triage");
  await page.locator("#patient-search").fill(patient.code);
  assert.equal(await page.locator(".patients-table tbody tr").count(), 1);
  await page.locator("[data-edit-patient]").click();
  await page.locator("#patient-phone").fill("(85) 99999-1234");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.reload();
  assert.equal(
    await page.evaluate((id) => Store.patient(id).phone, patient.id),
    "(85) 99999-1234",
  );
  pass("Cadastro, busca, edição e persistência após recarregar");
  await page.goto(
    base + "/triagem.html?patient=" + encodeURIComponent(patient.id),
  );
  await page.locator("[data-triage-form] button[type=submit]").click();
  await page.locator("[data-triage-form] button[type=submit]").click();
  assert.equal(await page.locator("[data-triage-errors]").isVisible(), true);
  await page.locator("input[name=risk][value=green]").check();
  await page.locator("#clinical-professional").selectOption("staff_01");
  await page
    .locator("#clinical-rationale")
    .fill(
      "Avaliação fictícia registrada pelo profissional para validação do fluxo.",
    );
  await page.locator("#clinical-vital-heartRate").fill("72");
  await page.locator("#clinical-vital-temperature").fill("36.5");
  await page.reload();
  assert.equal(
    await page.locator("#clinical-rationale").inputValue(),
    "Avaliação fictícia registrada pelo profissional para validação do fluxo.",
  );
  await page.locator("[data-triage-form] button[type=submit]").click();
  await page.locator("input[name=confirmed]").check();
  await page.screenshot({
    path: "test-results/triagem-revisao.png",
    fullPage: true,
  });
  const formAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.equal(
    formAudit.violations.length,
    0,
    JSON.stringify(
      formAudit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ),
  );
  await page.locator("[data-triage-form] button[type=submit]").click();
  assert.equal(
    await page.evaluate((id) => Store.patient(id).status, patient.id),
    "waiting",
  );
  assert.equal(
    await page.evaluate((id) => Store.patient(id).vitals.heartRate, patient.id),
    72,
  );
  pass(
    "Triagem: validação obrigatória, rascunho recuperado, revisão acessível e classificação manual",
  );
  await page.goto(base + "/fila.html");
  const ordered = await page.locator("[data-call]").evaluateAll((nodes) =>
    nodes.map((n) => {
      const p = Store.patient(n.dataset.call);
      return {
        rank: Store.risk(p.risk).rank,
        at: new Date(p.arrivalAt).getTime(),
      };
    }),
  );
  for (let j = 1; j < ordered.length; j++)
    assert.ok(
      ordered[j].rank >= ordered[j - 1].rank &&
        (ordered[j].rank !== ordered[j - 1].rank ||
          ordered[j].at >= ordered[j - 1].at),
    );
  await page.locator("#queue-search").fill(patient.code);
  await page.locator("[data-call]").click();
  await page.locator("#call-professional").selectOption("staff_08");
  await page.locator("#call-room").selectOption({ label: "Consultório 03" });
  await page.getByRole("button", { name: "Confirmar chamada" }).click();
  assert.equal(
    await page.evaluate((id) => Store.patient(id).status, patient.id),
    "attending",
  );
  pass(
    "Fila ordenada por prioridade/chegada e chamada com profissional e sala",
  );
  await page.goto(
    base + "/atendimentos.html?patient=" + encodeURIComponent(patient.id),
  );
  await page.locator("[data-action=evolution]").click();
  await page
    .locator("#care-note")
    .fill("Evolução fictícia registrada para conferir o histórico de cuidado.");
  await page.getByRole("button", { name: "Salvar evolução" }).click();
  await page.locator("[data-action=finish]").click();
  await page
    .locator("#care-outcome")
    .selectOption({ label: "Alta registrada" });
  await page
    .locator("#care-finish-note")
    .fill("Encerramento fictício da jornada, sem finalidade clínica.");
  await page.locator("input[name=confirmed]").check();
  await page
    .getByRole("button", { name: "Concluir e salvar registro" })
    .click();
  const finished = await page.evaluate((id) => Store.patient(id), patient.id);
  assert.equal(finished.status, "finished");
  assert.equal(finished.outcome, "Alta registrada");
  assert.ok(finished.history.some((h) => h.text.includes("Evolução fictícia")));
  assert.ok(
    finished.history.some((h) => h.text.includes("Encerramento fictício")),
  );
  await page.reload();
  assert.equal(
    await page.locator(".clinical-care-outcome").innerText(),
    "Alta registrada",
  );
  pass("Atendimento: evolução, conclusão, desfecho e histórico persistentes");
  await page.keyboard.press("Control+k");
  await page.locator("#global-search").fill(patient.code);
  await page.locator(".search-result").click();
  await page.waitForSelector(".timeline");
  assert.ok(
    (await page.locator("dialog").innerText()).includes("Evolução fictícia"),
  );
  await page.keyboard.press("Escape");
  await page.locator("dialog").waitFor({ state: "detached" });
  pass("Busca global por teclado, ficha completa e fechamento por Escape");
  await page.goto(base + "/equipe.html?q=Andr%C3%A9");
  assert.equal(await page.locator(".mg-staff-card").count(), 1);
  await page.locator("[data-staff-id]").selectOption("break");
  await page.reload();
  assert.equal(await page.locator("[data-staff-id]").inputValue(), "break");
  pass("Equipe: busca por link e mudança persistente da disponibilidade");
  await page.goto(base + "/relatorios.html");
  await page.locator("[data-period=today]").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#mg-export-report").click();
  const download = await downloadPromise;
  const file = await download.path();
  const csv = fs.readFileSync(file, "utf8");
  assert.ok(csv.includes(patient.code));
  assert.ok(!csv.startsWith("\uFEFF\uFEFF"));
  await page.locator("[data-period=custom]").click();
  await page.locator("#mg-from").fill("2020-01-01");
  await page.locator("#mg-to").fill("2020-01-02");
  await page.getByRole("button", { name: "Aplicar período" }).click();
  assert.equal(await page.locator(".mg-report-empty").count(), 1);
  pass(
    "Relatórios: datas, período sem dados e exportação CSV com o novo paciente",
  );
  await page.goto(base + "/index.html");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-menu").click();
  assert.equal(
    await page.locator("#mobile-menu").getAttribute("aria-expanded"),
    "true",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#mobile-menu").getAttribute("aria-expanded"),
    "false",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#help-button").click();
  assert.equal(await page.locator("dialog a[target=_blank]").count(), 3);
  await page.keyboard.press("Escape");
  await page.locator("#profile-button").click();
  await page.locator("#reset-demo").click();
  await page.locator("#confirm-reset").click();
  assert.equal(await page.evaluate(() => Store.patients().length), 84);
  pass("Menu móvel, ajuda com referências e restauração da demonstração");
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "test-results/e2e-report.json",
    JSON.stringify(
      { passed: checks, errors, timestamp: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(
    "\n" +
      checks.length +
      " verificações completas. Nenhum erro de JavaScript ou recurso ausente.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.kill();
  });
