import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/data/store-core.js';
function environment(records = new Map()) {
  const events = [];
  const store = createStore(
    {
      getItem: (key) => records.get(key) || null,
      setItem: (key, value) => records.set(key, value),
    },
    (event) => events.push(event),
  );
  return { store, records, events };
}
test('mantém todos os dados demonstrativos e suas relações', () => {
  const { store } = environment();
  assert.equal(store.patients().length, 84);
  assert.equal(store.staff().length, 8);
  for (const [status, count] of Object.entries({
    triage: 5,
    waiting: 14,
    attending: 5,
    finished: 60,
  }))
    assert.equal(
      store.patients().filter((p) => p.status === status).length,
      count,
    );
  assert.equal(new Set(store.patients().map((p) => p.id)).size, 84);
});
test('percurso do paciente persiste com datas, profissional, evolução e desfecho', () => {
  const { store, records } = environment();
  const p = store.addPatient({
    name: 'Pessoa de teste',
    birthDate: '1990-05-12',
  });
  assert.throws(
    () => store.updatePatient(p.id, { status: 'waiting' }),
    /classificação/,
  );
  store.updatePatient(p.id, {
    risk: 'yellow',
    status: 'waiting',
    vitals: { temperature: '37,2' },
  });
  store.updatePatient(p.id, {
    status: 'attending',
    professional: 'staff_02',
    room: 'Consultório 03',
  });
  store.addEvent(p.id, 'Evolução registrada pelo profissional.');
  store.updatePatient(p.id, { status: 'finished', outcome: 'Alta registrada' });
  const reloaded = environment(records).store.patient(p.id);
  assert.equal(reloaded.status, 'finished');
  assert.equal(reloaded.vitals.temperature, 37.2);
  assert.equal(reloaded.outcome, 'Alta registrada');
  assert.ok(reloaded.history.some((h) => h.text.includes('Rafael Costa')));
  assert.ok(reloaded.finishedAt && reloaded.startedAt && reloaded.triagedAt);
  assert.throws(
    () => store.updatePatient(p.id, { status: 'attending' }),
    /não é permitida/,
  );
});
test('somente emergência permite triagem para atendimento direto', () => {
  const { store } = environment();
  const p = store.addPatient({ name: 'Pessoa emergência' });
  assert.throws(
    () => store.updatePatient(p.id, { risk: 'yellow', status: 'attending' }),
    /não é permitida/,
  );
  assert.equal(store.patient(p.id).risk, null);
  store.updatePatient(p.id, {
    risk: 'red',
    status: 'attending',
    professional: 'staff_05',
  });
  assert.equal(store.patient(p.id).status, 'attending');
});
test('dados inválidos não alteram o estado; leitores recebem cópias', () => {
  const { store } = environment();
  const before = store.get();
  for (const patch of [
    { name: '' },
    { name: 'Teste', birthDate: '2024-02-31' },
    { name: 'Teste', birthDate: '2099-01-01' },
    { name: 'Teste', vitals: { spo2: 101 } },
    { name: 'Teste', vitals: { pain: 11 } },
  ])
    assert.throws(() => store.addPatient(patch));
  assert.throws(() => store.updateStaff('staff_01', { status: 'inexistente' }));
  assert.deepEqual(store.get(), before);
  const copy = store.patients();
  copy[0].name = 'Alterado';
  assert.notEqual(store.patients()[0].name, 'Alterado');
});
test('CSV preserva acentos e aspas, e neutraliza fórmulas de planilha', () => {
  const { store } = environment();
  const p = store.addPatient({
    name: '=SUM(1)',
    complaint: 'Observação; "aspas"',
    phone: '+5585000000000',
  });
  const csv = store.exportCSV([p]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes("'=SUM(1)"));
  assert.ok(csv.includes('Observação; ""aspas""'));
  assert.ok(csv.includes("'+5585000000000"));
});
test('sincronização externa atualiza sem regravar nem aceitar dados inválidos', () => {
  const first = environment();
  const second = environment(new Map(first.records));
  first.store.updateSettings({ hospital: 'Hospital de teste' });
  const old = second.records.get('clara:web:store:v1');
  assert.equal(
    second.store.sync(first.records.get('clara:web:store:v1')),
    true,
  );
  assert.equal(second.store.get().settings.hospital, 'Hospital de teste');
  assert.equal(second.records.get('clara:web:store:v1'), old);
  assert.equal(second.store.sync('{"version":99,"data":{}}'), false);
  assert.equal(second.store.get().settings.hospital, 'Hospital de teste');
});
test('falha de armazenamento mantém os dados da sessão e informa o problema', () => {
  const store = createStore({
    getItem: () => null,
    setItem: () => {
      throw new Error('Sem espaço');
    },
  });
  const p = store.addPatient({ name: 'Pessoa em memória' });
  assert.equal(store.storageAvailable, false);
  assert.match(store.storageError, /Não foi possível salvar/);
  assert.equal(store.patient(p.id).name, 'Pessoa em memória');
});
test('restauração recupera disponibilidade e preferências iniciais', () => {
  const { store } = environment();
  store.updateStaff('staff_01', { status: 'break' });
  store.updateSettings({ hospital: 'Hospital de teste' });
  store.reset();
  assert.equal(store.staff()[0].status, 'available');
  assert.equal(store.get().settings.hospital, 'Unidade MedFast');
});
