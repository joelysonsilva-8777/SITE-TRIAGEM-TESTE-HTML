const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "test-results");
fs.mkdirSync(output, { recursive: true });
const temp = path.join(root, ".tmp");
fs.mkdirSync(temp, { recursive: true });
process.env.TEMP = temp;
process.env.TMP = temp;
async function main() {
  const server = spawn(process.execPath, ["scripts/serve-web.cjs"], {
    cwd: root,
    env: { ...process.env, PORT: "8093" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const errors = [];
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Servidor de teste não iniciou.")),
        15000,
      );
      server.stdout.once("data", () => {
        clearTimeout(timeout);
        resolve();
      });
      server.once("error", reject);
      server.once("exit", (code) =>
        reject(new Error("Servidor encerrou: " + code)),
      );
    });
    browser = await chromium
      .launch({ headless: true })
      .catch(() => chromium.launch({ headless: true, channel: "msedge" }));
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    const button = (label) =>
      page.getByRole("button", { name: label, exact: true });
    const navigate = async (label) => {
      await page.getByRole("tab", { name: label, exact: true }).click();
    };
    const select = async (label, value) => {
      await page
        .getByRole("button", {
          name: new RegExp(
            "^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":",
          ),
        })
        .click();
      await page.getByRole("radio", { name: value, exact: true }).click();
    };
    const fill = (label, value) =>
      page.getByRole("textbox", { name: label, exact: true }).fill(value);
    await page.goto("http://127.0.0.1:8093");
    await button("Receber paciente").waitFor();
    await page.screenshot({ path: path.join(output, "dashboard-desktop.png") });
    await button("Receber paciente").click();
    await button("Cadastrar paciente").click();
    await page
      .getByText("Informe o nome completo do paciente.", { exact: true })
      .waitFor();
    await fill("Nome completo *", "Pessoa Teste Native");
    await fill("Data de nascimento (AAAA-MM-DD)", "1990-05-12");
    await fill("Queixa principal", "Relato fictício para testar o fluxo.");
    await button("Cadastrar e iniciar triagem").click();
    await button("Continuar").click();
    await fill("Temperatura (°C)", "37,2");
    await select("Classificação de risco *", "Urgente");
    await select("Enfermeiro(a) responsável *", "Camila Martins");
    await fill(
      "Achados e justificativa *",
      "Avaliação fictícia registrada pela equipe de teste.",
    );
    await button("Continuar").click();
    await button("Registrar triagem").click();
    await page
      .getByText("Confirme a revisão antes de registrar a triagem.", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("checkbox").check();
    await button("Registrar triagem").click();
    await page
      .getByText("Triagem concluída e registrada.", { exact: true })
      .waitFor();
    await button("Acompanhar atendimento").click();
    await fill("Buscar na fila", "Pessoa Teste Native");
    await button("Chamar paciente").click();
    await select("Profissional responsável *", "Rafael Costa · Médico");
    await fill("Local de atendimento *", "Consultório Native");
    await button("Confirmar início").click();
    await navigate("Atendimentos");
    await fill("Buscar atendimento", "Pessoa Teste Native");
    await button("Registrar evolução").click();
    await fill(
      "Evolução do atendimento *",
      "Evolução fictícia conferida no teste automatizado.",
    );
    await button("Salvar evolução").click();
    await button("Concluir").click();
    await select("Desfecho registrado *", "Alta registrada");
    await fill(
      "Observações de encerramento *",
      "Encerramento fictício definido pela equipe de teste.",
    );
    await page.getByRole("checkbox").check();
    await button("Concluir e salvar registro").click();
    await navigate("Concluídos hoje");
    await button("Ver ficha de Pessoa Teste Native").click();
    await page.getByText("Alta registrada", { exact: true }).waitFor();
    await button("Fechar janela").click();
    console.log(
      "OK: cadastro → triagem → fila → atendimento → evolução → conclusão.",
    );
    await page.reload();
    await navigate("Pacientes");
    await navigate("Todos os pacientes");
    await fill("Buscar paciente", "Pessoa Teste Native");
    await button("Ver ficha de Pessoa Teste Native").waitFor();
    await button("Editar cadastro").click();
    await fill("Telefone", "85999999999");
    await button("Salvar alterações").click();
    const downloaded = page.waitForEvent("download");
    await button("Exportar").click();
    const download = await downloaded;
    await download.saveAs(path.join(output, "pacientes.csv"));
    const csv = fs.readFileSync(path.join(output, "pacientes.csv"), "utf8");
    assert.ok(csv.includes("Pessoa Teste Native"));
    assert.ok(csv.includes("85999999999"));
    assert.ok(csv.includes("Alta registrada"));
    console.log("OK: persistência, edição e CSV filtrado.");
    await navigate("Equipe");
    await select("Disponibilidade de Camila Martins", "Em pausa");
    await page.reload();
    await page
      .getByRole("button", {
        name: "Disponibilidade de Camila Martins: Em pausa",
        exact: true,
      })
      .waitFor();
    await button("Consultar escala").click();
    await page
      .getByRole("heading", { name: "Escala da equipe", exact: true })
      .waitFor();
    await button("Fechar janela").click();
    await navigate("Relatórios");
    await navigate("Personalizado");
    await fill("Data inicial (AAAA-MM-DD)", "2026-12-31");
    await fill("Data final (AAAA-MM-DD)", "2026-01-01");
    await page
      .getByText("A data inicial deve ser anterior ou igual à final.", {
        exact: true,
      })
      .waitFor();
    await navigate("7 dias");
    await page.screenshot({
      path: path.join(output, "relatorios-desktop.png"),
    });
    console.log("OK: equipe, escala e filtros de relatórios.");
    const popupPromise = page.waitForEvent("popup");
    await button("Imprimir").click();
    const reportWindow = await popupPromise;
    await reportWindow
      .getByRole("heading", { name: "MedFast · Relatório de atendimento" })
      .waitFor();
    assert.ok(
      (await reportWindow.locator("body").textContent()).includes(
        "Pessoa Teste Native",
      ),
    );
    await reportWindow.close();
    await navigate("Triagem");
    const firstPatient = page
      .getByRole("button", { name: /^Selecionar / })
      .first();
    const patientLabel = await firstPatient.getAttribute("aria-label");
    await firstPatient.click();
    await fill("Queixa principal *", "Rascunho preservado ao trocar de tela.");
    await navigate("Equipe");
    await navigate("Triagem");
    await button(patientLabel).click();
    assert.equal(
      await page
        .getByRole("textbox", { name: "Queixa principal *", exact: true })
        .inputValue(),
      "Rascunho preservado ao trocar de tela.",
    );
    await button("Continuar").click();
    await select("Classificação de risco *", "Emergência");
    await select("Enfermeiro(a) responsável *", "Camila Martins");
    await fill(
      "Achados e justificativa *",
      "Exemplo fictício de classificação manual de emergência.",
    );
    await button("Continuar").click();
    await select("Destino após o registro", "Atendimento imediato iniciado");
    await page.getByRole("checkbox").check();
    await button("Registrar triagem").click();
    await page.getByText("Em atendimento", { exact: true }).waitFor();
    console.log(
      "OK: impressão, rascunho entre telas e encaminhamento imediato.",
    );
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "dashboard",
        "pacientes",
        "triagem",
        "fila",
        "atendimentos",
        "equipe",
        "relatorios",
      ]) {
        await page.goto(
          "http://127.0.0.1:8093/" + (route === "dashboard" ? "" : route),
        );
        await page
          .getByRole("button", { name: "MedFast, visão geral", exact: true })
          .waitFor();
        await page.waitForTimeout(120);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        assert.equal(overflow, false, route + " transborda em " + width);
        if (width === 390)
          await page.screenshot({
            path: path.join(output, route + "-mobile.png"),
          });
      }
      await button("Mais páginas").click();
      await page.getByRole("tab", { name: "Equipe", exact: true }).click();
      await page
        .getByRole("heading", { name: "Equipe do plantão", exact: true })
        .waitFor();
    }
    console.log("OK: sete telas em 320, 390 e 768 px; menu mobile.");
    await button("Mais páginas").click();
    await button("Meu perfil").click();
    await button("Restaurar dados de demonstração").click();
    await button("Confirmar restauração").click();
    await button("Receber paciente").waitFor();
    const restored = await page.evaluate(
      () => JSON.parse(localStorage.getItem("clara:store:v1")).data,
    );
    assert.equal(restored.patients.length, 84);
    assert.equal(restored.staff[0].status, "available");
    console.log("OK: restauração confirmada da demonstração.");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "result.json"),
      JSON.stringify({ passed: true, errors }, null, 2),
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
