const test = require("node:test");
const assert = require("node:assert/strict");
const { createStore } = require("../src/data/store-core");
const { createPersistence } = require("../src/data/persistence");
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
test("preserva os 84 pacientes e os oito profissionais do site", () => {
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
test("cadastro, triagem, evolução e conclusão sobrevivem ao recarregamento", () => {
  const { store, records } = environment();
  const p = store.addPatient({
    name: "Pessoa de teste",
    birthDate: "1990-05-12",
  });
  assert.throws(
    () => store.updatePatient(p.id, { status: "waiting" }),
    /classificação/,
  );
  store.updatePatient(p.id, {
    risk: "yellow",
    status: "waiting",
    vitals: { temperature: "37,2" },
  });
  store.updatePatient(p.id, {
    status: "attending",
    professional: "staff_02",
    room: "Consultório 03",
  });
  store.addEvent(p.id, "Evolução registrada pelo profissional.");
  store.updatePatient(p.id, { status: "finished", outcome: "Alta registrada" });
  const reloaded = environment(records).store.patient(p.id);
  assert.equal(reloaded.status, "finished");
  assert.equal(reloaded.vitals.temperature, 37.2);
  assert.equal(reloaded.outcome, "Alta registrada");
  assert.ok(reloaded.history.some((h) => h.text.includes("Rafael Costa")));
  assert.ok(reloaded.finishedAt);
  assert.throws(
    () => store.updatePatient(p.id, { status: "attending" }),
    /não é permitida/,
  );
});
test("emergência permite encaminhamento direto; outros riscos não permitem", () => {
  const { store } = environment();
  const p = store.addPatient({ name: "Pessoa emergência" });
  assert.throws(
    () => store.updatePatient(p.id, { risk: "yellow", status: "attending" }),
    /não é permitida/,
  );
  assert.equal(store.patient(p.id).risk, null);
  store.updatePatient(p.id, {
    risk: "red",
    status: "attending",
    professional: "staff_05",
  });
  assert.equal(store.patient(p.id).status, "attending");
});
test("validação inválida não altera dados e leitores não expõem estado mutável", () => {
  const { store } = environment(),
    before = store.get();
  for (const patch of [
    { name: "" },
    { name: "Teste", birthDate: "2024-02-31" },
    { name: "Teste", birthDate: "2099-01-01" },
    { name: "Teste", vitals: { spo2: 101 } },
    { name: "Teste", vitals: { pain: 11 } },
  ])
    assert.throws(() => store.addPatient(patch));
  assert.throws(() => store.updateStaff("staff_01", { status: "inexistente" }));
  assert.deepEqual(store.get(), before);
  const copy = store.patients();
  copy[0].name = "Alterado";
  assert.notEqual(store.patients()[0].name, "Alterado");
});
test("CSV mantém acentos, aspas e neutraliza fórmulas", () => {
  const { store } = environment();
  const p = store.addPatient({
    name: "=SUM(1)",
    complaint: 'Observação; "aspas"',
    phone: "+5585000000000",
  });
  const csv = store.exportCSV([p]);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes('"\'=SUM(1)"'));
  assert.ok(csv.includes('Observação; ""aspas""'));
  assert.ok(csv.includes('"\'+5585000000000"'));
});
test("disponibilidade, configurações e restauração", () => {
  const { store } = environment();
  store.updateStaff("staff_01", { status: "break" });
  store.updateSettings({ hospital: "Hospital teste" });
  assert.equal(store.staff()[0].status, "break");
  assert.equal(store.get().settings.hospital, "Hospital teste");
  store.reset();
  assert.equal(store.get().settings.hospital, "Unidade MedFast");
  assert.equal(store.staff()[0].status, "available");
});
test("gravações assíncronas permanecem ordenadas e recuperam uma falha", async () => {
  const completed = [],
    errors = [];
  let calls = 0;
  const persistence = createPersistence(
    {
      setItem: async (key, value) => {
        calls++;
        if (calls === 1) throw new Error("Sem espaço");
        await new Promise((resolve) =>
          setTimeout(resolve, value === "B" ? 15 : 1),
        );
        completed.push(value);
      },
    },
    (e) => errors.push(e),
  );
  persistence.write("store", "A");
  persistence.write("store", "B");
  persistence.write("store", "C");
  await persistence.flush();
  assert.equal(errors.length, 1);
  assert.deepEqual(completed, ["B", "C"]);
});
