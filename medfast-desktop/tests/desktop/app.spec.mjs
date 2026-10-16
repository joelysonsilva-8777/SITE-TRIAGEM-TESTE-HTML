import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { environment } from '../../scripts/environment.mjs';

test('aplicativo offline: cadastro, rascunho, reinício e triagem duráveis', async () => {
  mkdirSync('.tmp', { recursive: true });
  const userData = mkdtempSync(resolve('.tmp/desktop-e2e-'));
  const packaged = process.env.MEDFAST_PACKAGED_TEST === '1';
  const options = {
    executablePath: resolve(
      packaged
        ? 'release/win-unpacked/MedFast.exe'
        : 'node_modules/electron/dist/electron.exe',
    ),
    args: packaged ? [] : ['.'],
    env: environment({
      MEDFAST_USER_DATA: userData,
      MEDFAST_TEST_MODE: '1',
      MEDFAST_HIDDEN: '1',
    }),
    timeout: 60000,
  };
  let app;
  const errors = [];
  const open = async () => {
    app = await electron.launch(options);
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(
        false,
      ),
    );
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.locator('main')).toBeVisible();
    return page;
  };
  try {
    let page = await open();
    expect(
      await page.evaluate(() => ({
        node: typeof window.require,
        process: typeof window.process,
        invoke: typeof window.clara.invoke,
      })),
    ).toEqual({ node: 'undefined', process: 'undefined', invoke: 'undefined' });
    expect(
      (await page.evaluate(() => window.clara.load())).snapshot.patients,
    ).toHaveLength(0);
    // Every route and its assets are served from the installed application.
    for (const label of [
      'Pacientes',
      'Triagem',
      'Fila de atendimento',
      'Atendimentos',
      'Equipe',
      'Relatórios',
      'Visão geral',
    ]) {
      await page
        .getByRole('navigation')
        .getByRole('link', { name: new RegExp(`^${label}`) })
        .click();
      await expect(page.locator('main h1')).toBeVisible();
    }
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Equipe', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Cadastrar profissional', exact: true })
      .click();
    await page
      .getByLabel('Nome do profissional')
      .fill('Enfermeira Teste Local');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Cadastrar profissional', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page
      .getByRole('button', { name: 'Cadastrar profissional', exact: true })
      .click();
    await page.getByLabel('Nome do profissional').fill('Médico Teste Local');
    await page.getByLabel('Função', { exact: true }).selectOption('Médico');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Cadastrar profissional', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Pacientes', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Receber paciente', exact: true })
      .first()
      .click();
    await page
      .getByLabel('Nome completo')
      .fill('Paciente Teste Desktop Offline');
    await page.getByLabel('Data de nascimento').fill('1990-05-12');
    await page
      .getByLabel('Queixa principal')
      .fill('Registro fictício para teste local');
    await page
      .getByRole('button', { name: 'Cadastrar paciente', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    const state = await page.evaluate(() => window.clara.load());
    const patient = state.snapshot.patients[0];
    expect(patient.name).toBe('Paciente Teste Desktop Offline');
    expect(state.sync.pending).toBeGreaterThanOrEqual(3);
    await page.goto(`clara://app/triagem?paciente=${patient.id}`);
    // Select through the visible list if the application has no matching URL filter.
    if (!(await page.getByLabel('Nome completo').isVisible()))
      await page
        .getByRole('button')
        .filter({ hasText: patient.name })
        .first()
        .click();
    await page
      .getByLabel('Alergias informadas')
      .fill('Rascunho persistente de teste');
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.clara.load())).drafts[patient.id]
            ?.allergies,
      )
      .toBe('Rascunho persistente de teste');
    await app.close();
    page = await open();
    await page.goto(`clara://app/triagem?paciente=${patient.id}`);
    if (!(await page.getByLabel('Nome completo').isVisible()))
      await page
        .getByRole('button')
        .filter({ hasText: patient.name })
        .first()
        .click();
    await expect(page.getByLabel('Alergias informadas')).toHaveValue(
      'Rascunho persistente de teste',
    );
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.locator('input[name="risk"][value="green"]').check();
    await page
      .getByLabel('Enfermeiro responsável')
      .selectOption({ label: 'Enfermeira Teste Local' });
    await page
      .getByLabel('Avaliação e justificativa da classificação')
      .fill('Avaliação fictícia registrada somente para este teste.');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page
      .getByRole('button', { name: 'Concluir triagem', exact: true })
      .click();
    await expect(page).toHaveURL('clara://app/fila');
    await page.reload();
    await expect(
      page.getByText(patient.name, { exact: true }).first(),
    ).toBeVisible();
    const final = await page.evaluate(() => window.clara.load());
    expect(final.snapshot.patients[0].status).toBe('waiting');
    expect(final.snapshot.events.length).toBeGreaterThan(1);
    expect(final.drafts[patient.id]).toBeUndefined();
    await page
      .getByRole('button', { name: /Chamar/ })
      .first()
      .click();
    const doctor = final.snapshot.staff.find(
      (person) => person.role === 'Médico',
    );
    await page
      .getByLabel('Profissional responsável', { exact: true })
      .selectOption(doctor.id);
    await page.getByLabel('Sala de atendimento').selectOption('Consultório 01');
    await page
      .getByRole('button', { name: 'Chamar e iniciar atendimento' })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.goto('clara://app/atendimentos');
    await page.getByRole('button', { name: 'Evolução', exact: true }).click();
    await page
      .getByLabel('Evolução do atendimento')
      .fill('Evolução fictícia de teste do aplicativo Windows.');
    await page.getByRole('button', { name: 'Salvar evolução' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await page
      .getByLabel('Desfecho do atendimento')
      .selectOption('Alta registrada');
    await page
      .getByLabel('Observações finais')
      .fill('Orientações fictícias de conclusão do teste.');
    await page.getByRole('dialog').getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Confirmar finalização' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    const completed = await page.evaluate(() => window.clara.load());
    expect(completed.snapshot.patients[0].status).toBe('finished');
    expect(completed.snapshot.patients[0].notes).toContain('Evolução fictícia');
    expect(completed.snapshot.patients[0].notes).toContain(
      'Orientações fictícias',
    );
    await page.goto('clara://app/sincronizacao');
    await expect(page.getByLabel('E-mail da conta')).toHaveValue(
      'admin@clara.local',
    );
    await expect(
      page.getByRole('heading', { name: 'Backup protegido por senha' }),
    ).toBeVisible();
    const capture = async (path) => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      });
      const png = await app.evaluate(async ({ BrowserWindow }) =>
        (
          await BrowserWindow.getAllWindows()[0].webContents.capturePage(
            {},
            { stayHidden: true, stayAwake: true },
          )
        )
          .toPNG()
          .toString('base64'),
      );
      writeFileSync(path, Buffer.from(png, 'base64'));
    };
    await capture('test-results/sincronizacao.png');
    await page.goto('clara://app/');
    await expect(page.locator('main h1')).toBeVisible();
    await capture('test-results/visao-geral.png');
    expect(errors).toEqual([]);
    await app.close();
    app = null;
    const bytes = readFileSync(join(userData, 'data/clara.sqlite'));
    expect(bytes.includes(Buffer.from(patient.name))).toBe(false);
    expect(bytes.includes(Buffer.from('Rascunho persistente'))).toBe(false);
  } finally {
    await app?.close();
  }
});
