import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const key = 'clara:web:store:v1';
async function snapshot(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).data,
    key,
  );
}
async function receive(page: Page, name: string) {
  await page
    .getByRole('button', { name: 'Receber paciente', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome completo').fill(name);
  await dialog.getByLabel('Data de nascimento').fill('1990-05-12');
  await dialog
    .getByLabel('Queixa principal')
    .fill('Queixa fictícia para demonstração do fluxo.');
  await dialog.getByLabel('Alergias informadas').fill('Nenhuma relatada');
  await dialog.getByRole('button', { name: 'Cadastrar paciente' }).click();
  await expect(dialog).toBeHidden();
  return (await snapshot(page)).patients.find(
    (p: { name: string }) => p.name === name,
  ).id as string;
}
test('cadastro, rascunho, triagem, chamada, evolução, conclusão e persistência', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/pacientes');
  const id = await receive(page, 'Helena Teste Web');
  await page.goto(`/triagem?paciente=${id}`);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Temperatura', { exact: false }).fill('37,2');
  await page
    .getByRole('radio', { name: 'Urgente Prioridade 3', exact: true })
    .check();
  await page.getByLabel('Enfermeiro responsável').selectOption('staff_01');
  await page
    .getByLabel('Avaliação e justificativa')
    .fill('Avaliação fictícia registrada com escuta e sinais vitais.');
  await page.goto('/equipe');
  await page.goto(`/triagem?paciente=${id}`);
  await expect(page.getByLabel('Temperatura', { exact: false })).toHaveValue(
    '37,2',
  );
  await page.getByLabel('Saturação de O₂').fill('101');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('entre 0 e 100');
  await page.getByLabel('Saturação de O₂').fill('98');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Revisei os dados').check();
  await page.getByRole('button', { name: 'Concluir triagem' }).click();
  await expect(page).toHaveURL(/\/fila$/);
  await page
    .getByRole('searchbox', { name: 'Buscar pacientes' })
    .fill('Helena Teste Web');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Chamar', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Profissional responsável').selectOption('staff_02');
  await dialog.getByLabel('Sala de atendimento').selectOption('Consultório 03');
  await dialog
    .getByRole('button', { name: 'Chamar e iniciar atendimento' })
    .click();
  await page.goto('/atendimentos');
  await page.getByRole('searchbox').fill('Helena Teste Web');
  await expect(page.locator('.rw-care-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Evolução', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Evolução do atendimento')
    .fill(
      'Paciente avaliada. Orientações fictícias registradas para continuidade.',
    );
  await dialog.getByRole('button', { name: 'Salvar evolução' }).click();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Desfecho do atendimento')
    .selectOption('Alta registrada');
  await dialog
    .getByLabel('Observações finais')
    .fill('Alta demonstrativa com orientações de continuidade do cuidado.');
  await dialog.getByLabel('Confirmo a conclusão').check();
  await dialog.getByRole('button', { name: 'Confirmar finalização' }).click();
  await page.reload();
  const patient = (await snapshot(page)).patients.find(
    (p: { id: string }) => p.id === id,
  );
  expect(patient.status).toBe('finished');
  expect(patient.vitals.temperature).toBe(37.2);
  expect(patient.professional).toBe('staff_02');
  expect(patient.room).toBe('Consultório 03');
  expect(patient.notes).toContain('Orientações fictícias');
  expect(patient.outcome).toBe('Alta registrada');
  expect(errors).toEqual([]);
});
test('emergência tem encaminhamento direto e ficha acessível para impressão', async ({
  page,
}) => {
  await page.goto('/pacientes');
  const id = await receive(page, 'Pessoa Emergência Web');
  await page.goto(`/triagem?paciente=${id}`);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('radio', { name: 'Emergência Prioridade 1' }).check();
  await page.getByLabel('Enfermeiro responsável').selectOption('staff_01');
  await page
    .getByLabel('Avaliação e justificativa')
    .fill('Avaliação fictícia com indicação de atendimento imediato.');
  await page
    .getByLabel('Encaminhamento', { exact: true })
    .selectOption('attending');
  await page.getByLabel('Profissional médico').selectOption('staff_05');
  await page
    .getByLabel('Sala', { exact: true })
    .selectOption('Sala de emergência');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Revisei os dados').check();
  await page.getByRole('button', { name: 'Concluir triagem' }).click();
  await expect(page).toHaveURL(/\/atendimentos$/);
  await page.getByRole('searchbox').fill('Pessoa Emergência Web');
  await page
    .getByRole('button', { name: 'Pessoa Emergência Web', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Sala de emergência');
  const accessibility = await new AxeBuilder({ page })
    .include('dialog')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.app-shell')).toBeHidden();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
test('busca, edição, CSV, configurações e sincronização entre abas', async ({
  page,
  context,
}) => {
  await page.goto('/pacientes');
  await receive(page, 'Ágata Exportação Web');
  await page.getByRole('searchbox').fill('agata exportacao');
  await expect(
    page.getByRole('button', { name: 'Ágata Exportação Web', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Editar Ágata Exportação Web' })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Telefone de contato')
    .fill('+5585000000000');
  await page.getByRole('button', { name: 'Salvar cadastro' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('medfast-pacientes.csv');
  const second = await context.newPage();
  await second.goto('/equipe');
  await page.goto('/equipe');
  await page
    .getByLabel('Disponibilidade de Camila Martins')
    .selectOption('break');
  await expect(
    second.getByLabel('Disponibilidade de Camila Martins'),
  ).toHaveValue('break');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog').getByRole('searchbox')).toBeFocused();
  await page.getByRole('dialog').getByRole('searchbox').fill('agata');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Ágata Exportação Web/ })
    .click();
  await expect(page.getByRole('dialog')).toContainText('+5585000000000');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /BEM-VINDA AO MEDFAST/ }).click();
  await page.getByLabel('Seu nome').fill('Maria Teste');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(
    second.getByRole('button', { name: /BEM-VINDA AO MEDFAST/ }),
  ).toContainText('Maria Teste');
  await second.close();
  await page.getByRole('button', { name: 'Escala do plantão' }).click();
  await expect(page.getByRole('dialog').locator('tbody tr')).toHaveCount(8);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /BEM-VINDA AO MEDFAST/ }).click();
  await page.getByRole('button', { name: 'Restaurar demonstração' }).click();
  await page.getByLabel('Entendo e quero restaurar').check();
  await page
    .getByRole('button', { name: 'Restaurar dados de exemplo' })
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect((await snapshot(page)).patients).toHaveLength(84);
  expect((await snapshot(page)).settings.userName).toBe('Camila Martins');
});
test('relatório valida período, exporta e imprime todos os registros filtrados', async ({
  page,
}) => {
  await page.goto('/relatorios');
  await page.getByLabel('Período', { exact: true }).selectOption('custom');
  await page.getByLabel('Data inicial').fill('2024-03-02');
  await page.getByLabel('Data final').fill('2024-03-01');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  await expect(page.getByRole('alert')).toContainText('anterior ou igual');
  await page.getByLabel('Período', { exact: true }).selectOption('30');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(
    /^medfast-relatorio-/,
  );
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.rw-print-only tbody tr')).toHaveCount(84);
  await expect(page.locator('.rw-screen-only')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
});
test('telas acessíveis, ativos carregados e layout responsivo sem transbordamento', async ({
  page,
}) => {
  test.setTimeout(180000);
  const routes = [
    '/',
    '/pacientes',
    '/triagem',
    '/fila',
    '/atendimentos',
    '/equipe',
    '/relatorios',
  ];
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:5178'))
      failures.push(`${r.status()} ${r.url()}`);
  });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations, route).toEqual([]);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
    }
    if (route === '/' || route === '/equipe' || route === '/triagem') {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: `test-results/${route.replace('/', '') || 'dashboard'}-desktop.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 900 });
      await page.screenshot({
        path: `test-results/${route.replace('/', '') || 'dashboard'}-mobile.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Equipe', exact: true })
    .click();
  await expect(page).toHaveURL(/\/equipe$/);
  await expect(
    page.getByRole('button', { name: 'Abrir menu', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  expect(failures).toEqual([]);
});
