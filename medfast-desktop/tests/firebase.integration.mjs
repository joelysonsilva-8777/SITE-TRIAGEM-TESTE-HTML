import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { LocalDatabase } from '../electron/database.mjs';
import { FirebaseClient } from '../electron/firebase-client.mjs';
import { AppService } from '../electron/service.mjs';
import { SyncEngine } from '../electron/sync-engine.mjs';
import { randomUUID } from 'node:crypto';

const projectId = 'demo-medfast-desktop',
  unit = 'unidade-principal';
let env, account;
const temp = resolve('.tmp');
mkdirSync(temp, { recursive: true });
const codec = {
  encrypt: (value) => Buffer.from(value).toString('base64'),
  decrypt: (value) => Buffer.from(value, 'base64').toString(),
};
const databases = [];
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8183,
      rules: readFileSync('firebase/firestore.rules', 'utf8'),
    },
  });
  await env.clearFirestore();
  const response = await fetch(
    'http://127.0.0.1:9193/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin-test@MedFast.local',
        password: 'password-for-emulator-only',
        returnSecureToken: true,
      }),
    },
  );
  account = await response.json();
  assert.ok(account.localId, JSON.stringify(account));
  await env.withSecurityRulesDisabled(async (context) => {
    for (const [uid, role, active] of [
      [account.localId, 'admin', true],
      ['editor', 'editor', true],
      ['viewer', 'viewer', true],
      ['revoked', 'admin', false],
    ]) {
      await setDoc(doc(context.firestore(), 'units', unit, 'members', uid), {
        role,
        active,
        email: `${uid}@example.test`,
      });
    }
  });
});
after(async () => {
  databases.forEach((db) => db.close());
  await env?.cleanup();
});
function fixture() {
  const db = new LocalDatabase(
    join(mkdtempSync(join(temp, 'firebase-test-')), 'local.sqlite'),
    codec,
  );
  databases.push(db);
  const cloud = new FirebaseClient(
    { apiKey: 'demo-key', projectId, unitId: unit },
    db,
    { emulator: { firestore: '127.0.0.1:8183', auth: '127.0.0.1:9193' } },
  );
  const sync = new SyncEngine(db, cloud);
  const service = new AppService(db, cloud, sync);
  service.sync = { status: () => sync.status(), run: async () => {} };
  return { db, cloud, sync, service };
}
function writeRecord(
  context,
  key,
  payload,
  {
    kind = 'staff',
    id = key,
    version = 1,
    opId = randomUUID(),
    uid = 'editor',
    atomic = true,
  } = {},
) {
  const db = context.firestore(),
    recordKey = `${kind}_${id}`;
  const record = {
    schema: 1,
    kind,
    id,
    payload,
    version,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    deviceId: 'device-test',
    opId,
  };
  if (!atomic)
    return setDoc(doc(db, 'units', unit, 'records', recordKey), record);
  const batch = writeBatch(db);
  batch.set(doc(db, 'units', unit, 'records', recordKey), record);
  batch.set(doc(db, 'units', unit, 'operations', opId), {
    key: recordKey,
    kind,
    id,
    baseVersion: version - 1,
    version,
    uid,
    deviceId: 'device-test',
    at: serverTimestamp(),
  });
  return batch.commit();
}
const staff = (id) => ({
  id,
  name: 'Profissional Teste',
  role: 'Enfermeira',
  department: 'Triagem',
  shift: '07h - 19h',
  status: 'available',
  initials: 'PT',
  color: 'sage',
});

test('nega acesso anônimo, de outra unidade e de membro revogado', async () => {
  await assertFails(
    getDoc(
      doc(
        env.unauthenticatedContext().firestore(),
        'units',
        unit,
        'records',
        'staff_any',
      ),
    ),
  );
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext('outsider').firestore(),
        'units',
        unit,
        'records',
        'staff_any',
      ),
    ),
  );
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext('revoked').firestore(),
        'units',
        unit,
        'records',
        'staff_any',
      ),
    ),
  );
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext('editor').firestore(),
        'units',
        'outra-unidade',
        'records',
        'staff_any',
      ),
    ),
  );
});
test('não permite autoaprovação nem elevação de privilégio', async () => {
  const attacker = env.authenticatedContext('outsider').firestore();
  await assertFails(
    setDoc(doc(attacker, 'units', unit, 'members', 'outsider'), {
      role: 'admin',
      active: true,
      email: 'x@example.test',
    }),
  );
  await assertFails(
    updateDoc(
      doc(
        env.authenticatedContext('editor').firestore(),
        'units',
        unit,
        'members',
        'editor',
      ),
      { role: 'admin' },
    ),
  );
  await assertSucceeds(
    getDoc(doc(attacker, 'units', unit, 'members', 'outsider')),
  );
});
test('consulta pode ler, mas não gravar; edição precisa de recibo atômico', async () => {
  await assertSucceeds(
    getDoc(
      doc(
        env.authenticatedContext('viewer').firestore(),
        'units',
        unit,
        'records',
        'staff_any',
      ),
    ),
  );
  await assertFails(
    writeRecord(
      env.authenticatedContext('viewer'),
      'viewer-write',
      staff('viewer-write'),
      { uid: 'viewer' },
    ),
  );
  await assertFails(
    writeRecord(
      env.authenticatedContext('editor'),
      'no-receipt',
      staff('no-receipt'),
      { atomic: false },
    ),
  );
  await assertSucceeds(
    writeRecord(
      env.authenticatedContext('editor'),
      'valid-staff',
      staff('valid-staff'),
    ),
  );
});
test('rejeita versões antigas, campos extras, dados malformados e exclusões', async () => {
  const context = env.authenticatedContext('editor');
  await assertFails(
    writeRecord(context, 'valid-staff', staff('valid-staff'), { version: 1 }),
  );
  await assertFails(
    writeRecord(context, 'invalid-staff', {
      ...staff('invalid-staff'),
      status: 'invalid',
    }),
  );
  await assertFails(
    writeRecord(context, 'extra-field', {
      ...staff('extra-field'),
      secretAdmin: true,
    }),
  );
  await assertFails(
    deleteDoc(
      doc(context.firestore(), 'units', unit, 'records', 'staff_valid-staff'),
    ),
  );
});
test('operações e eventos de cuidado não podem ser reescritos', async () => {
  const context = env.authenticatedContext('editor');
  const opId = randomUUID();
  await assertSucceeds(
    writeRecord(context, 'audit-staff', staff('audit-staff'), { opId }),
  );
  await assertFails(
    updateDoc(doc(context.firestore(), 'units', unit, 'operations', opId), {
      version: 99,
    }),
  );
  const event = {
    id: 'event_test',
    patientId: 'patient_test',
    at: new Date().toISOString(),
    text: 'Teste de registro imutável',
    type: 'note',
  };
  await assertSucceeds(
    writeRecord(context, event.id, event, { kind: 'events' }),
  );
  await assertFails(
    writeRecord(
      context,
      event.id,
      { ...event, text: 'Alterado' },
      { kind: 'events', version: 2 },
    ),
  );
});
test('login real no emulador envia a fila offline e baixa os dados em outro computador', async () => {
  const first = fixture();
  const p = first.service.command('addPatient', [
    {
      name: 'Paciente Offline Firebase',
      birthDate: '1990-01-01',
      complaint: 'Teste de integração offline',
    },
  ]).result;
  assert.equal(first.db.status().pending, 2);
  await first.cloud.login(
    'admin-test@MedFast.local',
    'password-for-emulator-only',
  );
  await first.sync.run(true);
  assert.equal(first.sync.state, 'synced', first.sync.message);
  assert.equal(first.db.status().pending, 0);
  const second = fixture();
  await second.cloud.login(
    'admin-test@MedFast.local',
    'password-for-emulator-only',
  );
  await second.sync.run(true);
  assert.equal(
    second.db.snapshot().patients.find((item) => item.id === p.id).name,
    p.name,
  );
  // Diverging edits from two installations produce an explicit conflict, never silent replacement.
  first.service.command('updatePatient', [p.id, { phone: '11111111' }]);
  second.service.command('updatePatient', [p.id, { phone: '22222222' }]);
  await first.sync.run(true);
  await second.sync.run(true);
  assert.equal(second.db.conflicts().length, 1);
  assert.equal(
    second.db.snapshot().patients.find((item) => item.id === p.id).phone,
    '22222222',
  );
  second.db.resolve(`patients_${p.id}`, 'local');
  await second.sync.run(true);
  assert.equal(second.db.status().pending, 0, second.sync.message);
  await first.sync.run(true);
  assert.equal(
    first.db.snapshot().patients.find((item) => item.id === p.id).phone,
    '22222222',
  );
});
test('atendimento completo offline pode avançar várias etapas antes do envio', async () => {
  const f = fixture();
  await f.cloud.login('admin-test@MedFast.local', 'password-for-emulator-only');
  const p = f.service.command('addPatient', [
    {
      name: 'Percurso Offline Firebase',
      birthDate: '1990-05-12',
      complaint: 'Avaliação fictícia',
    },
  ]).result;
  await f.sync.run(true);
  f.service.command('updateWithEvent', [
    p.id,
    {
      risk: 'green',
      status: 'waiting',
      vitals: { ...p.vitals, temperature: 36.8 },
    },
    'Avaliação registrada por enfermeiro de teste.',
  ]);
  f.service.command('updatePatient', [
    p.id,
    { status: 'attending', professional: 'staff_test', room: 'Consultório 01' },
  ]);
  f.service.command('updateWithEvent', [
    p.id,
    {
      status: 'finished',
      outcome: 'Alta registrada',
      notes: 'Orientações de teste registradas.',
    },
    'Atendimento finalizado pelo profissional.',
  ]);
  await f.sync.run(true);
  assert.equal(f.db.status().pending, 0, f.sync.message);
  assert.equal(f.sync.state, 'synced', f.sync.message);
});
