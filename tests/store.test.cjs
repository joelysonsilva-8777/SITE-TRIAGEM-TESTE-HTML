const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/store.js"),
  "utf8",
);

function environment(options = {}) {
  const records = options.records || new Map();
  const events = [];
  const listeners = {};
  const window = {
    localStorage: {
      getItem(key) {
        if (options.unavailable) throw new Error("blocked");
        return records.get(key) || null;
      },
      setItem(key, value) {
        if (options.unavailable) throw new Error("blocked");
        records.set(key, value);
      },
    },
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    dispatchEvent(event) {
      events.push(event);
      (listeners[event.type] || []).forEach((fn) => fn(event));
    },
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
  };
  vm.runInNewContext(source, { window, console });
  return { store: window.Store, window, records, events, listeners };
}

test("seed has coherent active counts, chronological histories and completed history", () => {
  const { store } = environment();
  const patients = store.patients();
  assert.equal(patients.filter((p) => p.status === "waiting").length, 14);
  assert.equal(patients.filter((p) => p.status === "triage").length, 5);
  assert.equal(patients.filter((p) => p.status === "attending").length, 5);
  assert.equal(patients.filter((p) => p.status === "finished").length, 60);
  assert.equal(new Set(patients.map((p) => p.id)).size, patients.length);
  assert.equal(new Set(patients.map((p) => p.name)).size, patients.length);
  assert.equal(store.staff().length, 8);
  for (const patient of patients) {
    const dates = [
      patient.arrivalAt,
      patient.triagedAt,
      patient.startedAt,
      patient.finishedAt,
    ]
      .filter(Boolean)
      .map(Date.parse);
    assert.deepEqual(
      dates,
      [...dates].sort((a, b) => a - b),
    );
    assert.ok(
      dates.every((date) => date <= Date.now()),
      patient.code + " has future timestamps",
    );
    assert.equal(patient.history.length, dates.length);
  }
});

test("registration, classification, attendance and completion persist across reloads", () => {
  const env = environment();
  const patient = env.store.addPatient({
    name: "  Pessoa de teste  ",
    birthDate: "1990-05-12",
    complaint: "Queixa fictícia",
    unknown: "ignored",
  });
  assert.equal(patient.name, "Pessoa de teste");
  assert.equal(patient.status, "triage");
  assert.equal(patient.unknown, undefined);
  assert.equal(env.events.at(-1).type, "clara:change");
  assert.throws(
    () => env.store.updatePatient(patient.id, { status: "waiting" }),
    /classificação/,
  );
  assert.equal(env.store.patient(patient.id).status, "triage");
  const classified = env.store.updatePatient(patient.id, {
    status: "waiting",
    risk: "yellow",
    vitals: { temperature: "37,2", pain: 4 },
  });
  assert.equal(classified.vitals.temperature, 37.2);
  assert.ok(classified.triagedAt);
  const attending = env.store.updatePatient(patient.id, {
    status: "attending",
    professional: "Profissional de teste",
    room: "Sala 01",
  });
  assert.ok(attending.startedAt);
  const finished = env.store.updatePatient(patient.id, { status: "finished" });
  assert.ok(finished.finishedAt);
  assert.equal(finished.history.length, 5);
  assert.throws(
    () => env.store.updatePatient(patient.id, { status: "waiting" }),
    /não é permitida/,
  );
  const reloaded = environment({ records: env.records }).store.patient(
    patient.id,
  );
  assert.equal(reloaded.status, "finished");
  assert.equal(reloaded.professional, "Profissional de teste");
  assert.equal(reloaded.vitals.temperature, 37.2);
});

test("validation is atomic and invalid identities cannot mutate records", () => {
  const { store } = environment();
  const before = JSON.stringify(store.get());
  assert.throws(() => store.addPatient({ name: "   " }), /nome/);
  assert.throws(
    () => store.addPatient({ name: "Teste", birthDate: "2024-02-31" }),
    /nascimento/,
  );
  assert.throws(
    () => store.addPatient({ name: "Teste", birthDate: "2099-01-01" }),
    /nascimento/,
  );
  assert.throws(
    () => store.addPatient({ name: "Teste", vitals: { spo2: 102 } }),
    /saturação/,
  );
  assert.throws(() => store.updatePatient("patient_001", { name: "" }), /nome/);
  assert.throws(
    () => store.updatePatient("patient_001", { risk: "invented" }),
    /classificação/,
  );
  assert.throws(
    () => store.updateStaff("staff_01", { status: "invented" }),
    /Disponibilidade/,
  );
  assert.equal(store.updatePatient("missing", { name: "Teste" }), null);
  assert.equal(store.updateStaff("missing", {}), null);
  assert.equal(store.addEvent("missing", "Teste"), null);
  assert.equal(JSON.stringify(store.get()), before);
  const copy = store.patients();
  copy[0].name = "Mutated";
  assert.notEqual(store.patient(copy[0].id).name, "Mutated");
  assert.throws(
    () =>
      store.updatePatient("patient_015", {
        status: "attending",
        risk: "yellow",
      }),
    /não é permitida/,
  );
  assert.equal(JSON.stringify(store.get()), before);
});

test("CSV preserves punctuation and protects formula-like cells", () => {
  const { store } = environment();
  const patient = store.addPatient({
    name: '=HYPERLINK("x")',
    complaint: 'Linha 1\nLinha 2; "citação"',
    phone: "+5585000000000",
    notes: "\t@SUM(1)",
  });
  const csv = store.exportCSV([patient]);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes('"\'+5585000000000"'));
  assert.ok(csv.includes('"\'@SUM(1)"'));
  assert.ok(csv.includes('"Linha 1\nLinha 2; ""citação"""'));
});

test("unavailable or corrupt storage remains usable and reports failed saves", () => {
  const blocked = environment({ unavailable: true });
  assert.equal(blocked.store.storageAvailable, false);
  assert.ok(blocked.store.storageError);
  assert.ok(
    blocked.events.some((event) => event.type === "clara:storage-error"),
  );
  const patient = blocked.store.addPatient({ name: "Teste em memória" });
  assert.equal(blocked.store.patient(patient.id).name, "Teste em memória");
  const records = new Map([["clara:store:v1", "{invalid json"]]);
  const recovered = environment({ records });
  assert.equal(recovered.store.patients().length, 84);
  assert.equal(JSON.parse(records.get("clara:store:v1")).version, 1);
});

test("staff updates, notes and settings save; reset restores demonstration", () => {
  const { store } = environment();
  assert.equal(
    store.updateStaff("staff_01", { status: "break" }).status,
    "break",
  );
  assert.equal(
    store.updateSettings({ hospital: "Hospital demonstrativo" }).hospital,
    "Hospital demonstrativo",
  );
  const event = store.addEvent("patient_001", "Observação do teste");
  assert.equal(event.text, "Observação do teste");
  assert.equal(
    store.patient("patient_001").history.at(-1).text,
    "Observação do teste",
  );
  assert.equal(store.get().events[0].id, event.id);
  store.reset();
  assert.equal(store.get().settings.hospital, "Hospital Santa Clara");
  assert.equal(store.staff()[0].status, "available");
});

test("valid storage events update another open page", () => {
  const first = environment();
  const second = environment({ records: first.records });
  const added = first.store.addPatient({ name: "Teste entre abas" });
  second.listeners.storage[0]({
    key: "clara:store:v1",
    newValue: first.records.get("clara:store:v1"),
  });
  assert.equal(second.store.patient(added.id).name, "Teste entre abas");
  assert.equal(second.events.at(-1).detail.external, true);
  second.listeners.storage[0]({ key: "clara:store:v1", newValue: "corrupted" });
  assert.equal(second.store.patient(added.id).name, "Teste entre abas");
});

test("red classification allows direct attendance and professional IDs remain readable in history", () => {
  const { store } = environment();
  const registered = store.addPatient({
    name: "Teste de emergência",
    sex: "Intersexo",
  });
  const emergency = store.updatePatient(registered.id, {
    risk: "red",
    status: "attending",
    professional: "staff_05",
    room: "Sala de emergência",
  });
  assert.equal(emergency.sex, "Intersexo");
  assert.equal(emergency.status, "attending");
  assert.equal(emergency.professional, "staff_05");
  assert.ok(emergency.triagedAt);
  assert.ok(emergency.startedAt);
  assert.equal(
    emergency.history.at(-1).text,
    "Atendimento iniciado por Juliana Ribeiro.",
  );
  assert.ok(
    store
      .patients()
      .filter((p) => p.status === "attending")
      .every((p) => store.staff().some((s) => s.id === p.professional)),
  );
});
