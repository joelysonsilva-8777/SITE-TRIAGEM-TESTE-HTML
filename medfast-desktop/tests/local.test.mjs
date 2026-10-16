import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  LocalDatabase,
  encryptBackup,
  decryptBackup,
} from '../electron/database.mjs';
import { AppService } from '../electron/service.mjs';
import { SyncEngine } from '../electron/sync-engine.mjs';
import { createStore } from '../src/data/store-core.js';
const temporary = resolve('.tmp');
mkdirSync(temporary, { recursive: true });
const testCodec = {
  encrypt: (value) => Buffer.from(value).toString('base64'),
  decrypt: (value) => Buffer.from(value, 'base64').toString(),
};
test('base inválida nunca é substituída por dados de demonstração', () => {
  let writes = 0;
  for (const raw of [
    null,
    '{}',
    '{invalid',
    JSON.stringify({
      version: 1,
      data: { patients: [], staff: [], events: [] },
    }),
  ]) {
    assert.throws(
      () =>
        createStore({
          getItem: () => raw,
          setItem: () => {
            writes++;
          },
        }),
      /validar os dados locais/,
    );
  }
  assert.equal(writes, 0);
});
const patient = (name) => ({
  name,
  birthDate: '1990-05-12',
  complaint: 'Registro fictício de teste',
  allergies: '',
  sex: 'Não informado',
});
function cloudMock() {
  const records = new Map(),
    receipts = new Map();
  return {
    config: { projectId: 'demo-test', unitId: 'unit' },
    records,
    receipts,
    publicSession: () => ({
      uid: 'user',
      email: 'test@example.test',
      role: 'admin',
    }),
    authorize: async () => {},
    async send(op) {
      if (receipts.has(op.opId)) return { version: receipts.get(op.opId) };
      const old = records.get(op.key);
      if ((old?.version || 0) !== op.baseVersion) return { conflict: old };
      const value = {
        kind: op.kind,
        id: op.id,
        payload: structuredClone(op.payload),
        version: op.baseVersion + 1,
        opId: op.opId,
      };
      records.set(op.key, value);
      receipts.set(op.opId, value.version);
      return { version: value.version };
    },
    pull: async () => [...records.values()].map((v) => structuredClone(v)),
  };
}
function fixture(cloud = cloudMock()) {
  const path = join(
    mkdtempSync(join(temporary, 'local-test-')),
    'clara.sqlite',
  );
  const db = new LocalDatabase(path, testCodec);
  const sync = new SyncEngine(db, cloud);
  const service = new AppService(db, cloud, sync);
  // Tests drive sync explicitly; local commands must not start background work.
  service.sync = { status: () => sync.status(), run: async () => {} };
  return { path, db, cloud, sync, service };
}
test('registro e fila de envio são gravados juntos e sobrevivem ao reinício', () => {
  const f = fixture();
  const value = f.service.command('addPatient', [
    patient('Paciente Offline'),
  ]).result;
  assert.equal(f.db.status().pending, 2);
  f.db.saveDraft(value.id, { id: value.id, rationale: 'rascunho' });
  f.db.close();
  const reopened = new LocalDatabase(f.path, testCodec);
  assert.equal(reopened.snapshot().patients[0].name, 'Paciente Offline');
  assert.equal(reopened.pending().length, 2);
  assert.equal(reopened.drafts()[value.id].rationale, 'rascunho');
  reopened.close();
});
test('falha de gravação reverte paciente, histórico e outbox atomicamente', () => {
  const { db, service } = fixture();
  db.db.exec(
    "CREATE TRIGGER fail_write BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'disk failure'); END;",
  );
  assert.throws(
    () => service.command('addPatient', [patient('Falha de disco')]),
    /disk failure/,
  );
  assert.equal(db.snapshot().patients.length, 0);
  assert.equal(db.status().pending, 0);
  db.db.exec('DROP TRIGGER fail_write');
  service.command('addPatient', [patient('Gravação recuperada')]);
  assert.equal(db.snapshot().patients.length, 1);
  db.close();
});
test('confirmação perdida é reenviada sem duplicar o envio remoto', async () => {
  const f = fixture();
  f.service.command('addPatient', [patient('Reenvio seguro')]);
  const send = f.cloud.send.bind(f.cloud);
  let dropped = false;
  f.cloud.send = async (op) => {
    const result = await send(op);
    if (!dropped) {
      dropped = true;
      throw new Error('Conexão caiu depois do commit');
    }
    return result;
  };
  await f.sync.run(true);
  assert.equal(f.db.status().pending, 2);
  f.db.close();
  const reopened = new LocalDatabase(f.path, testCodec);
  const sync = new SyncEngine(reopened, f.cloud);
  await sync.run(true);
  assert.equal(reopened.status().pending, 0);
  assert.equal(f.cloud.receipts.size, 2);
  reopened.close();
});
test('edição local durante envio continua na fila e usa a versão confirmada', async () => {
  const f = fixture();
  const p = f.service.command('addPatient', [patient('Versão inicial')]).result;
  const old = f.db.pending().find((o) => o.kind === 'patients');
  f.service.command('updatePatient', [p.id, { name: 'Versão mais recente' }]);
  const remote = await f.cloud.send(old);
  f.db.acknowledge(old, remote.version);
  const next = f.db.pending().find((o) => o.kind === 'patients');
  assert.equal(next.baseVersion, 1);
  assert.equal(next.payload.name, 'Versão mais recente');
  await f.sync.run(true);
  assert.equal(
    f.cloud.records.get(old.key).payload.name,
    'Versão mais recente',
  );
  f.db.close();
});
test('conflitos preservam duas versões e exigem resolução explícita', async () => {
  const f = fixture();
  const p = f.service.command('addPatient', [
    patient('Pessoa compartilhada'),
  ]).result;
  await f.sync.run(true);
  f.service.command('updatePatient', [p.id, { phone: 'telefone-local' }]);
  const key = `patients_${p.id}`;
  const remote = f.cloud.records.get(key);
  f.cloud.records.set(key, {
    ...remote,
    version: 2,
    opId: 'outro-envio',
    payload: { ...remote.payload, phone: 'telefone-remoto' },
  });
  await f.sync.run(true);
  assert.equal(f.db.conflicts().length, 1);
  assert.equal(f.db.snapshot().patients[0].phone, 'telefone-local');
  f.db.resolve(key, 'local');
  await f.sync.run(true);
  assert.equal(f.db.conflicts().length, 0);
  assert.equal(f.cloud.records.get(key).payload.phone, 'telefone-local');
  assert.equal(f.db.exportState().tables.resolutions.length, 1);
  f.db.close();
});
test('download remoto não apaga uma edição local ainda pendente', async () => {
  const f = fixture();
  const p = f.service.command('addPatient', [patient('Pendente')]).result;
  const remote = {
    kind: 'patients',
    id: p.id,
    payload: { ...p, name: 'Remoto' },
    version: 1,
    opId: 'other',
  };
  f.db.receive([remote]);
  assert.equal(f.db.snapshot().patients[0].name, 'Pendente');
  assert.equal(f.db.conflicts().length, 1);
  f.db.resolve(`patients_${p.id}`, 'remote');
  assert.equal(f.db.snapshot().patients[0].name, 'Remoto');
  f.db.close();
});
test('backup autenticado restaura filas e rejeita senha incorreta', () => {
  const f = fixture();
  f.service.command('addPatient', [patient('Backup offline')]);
  const backup = encryptBackup(
    f.db.exportState(),
    'senha de teste com 25 caracteres',
  );
  assert.equal(backup.includes('Backup offline'), false);
  assert.throws(() => decryptBackup(backup, 'senha errada'), /Senha incorreta/);
  const second = fixture();
  second.db.restoreState(
    decryptBackup(backup, 'senha de teste com 25 caracteres'),
  );
  assert.equal(second.db.snapshot().patients[0].name, 'Backup offline');
  assert.equal(second.db.status().pending, 2);
  assert.equal(second.db.getMeta('session'), null);
  f.db.close();
  second.db.close();
});
test('consulta e conta bloqueada não podem alterar o banco local', () => {
  const f = fixture();
  f.cloud.publicSession = () => ({ role: 'viewer' });
  assert.throws(
    () => f.service.command('addPatient', [patient('Bloqueado')]),
    /permissão/,
  );
  assert.equal(f.db.snapshot().patients.length, 0);
  f.db.close();
});
test('identificadores de pacientes são diferentes em computadores offline', () => {
  const first = fixture(),
    second = fixture();
  const a = first.service.command('addPatient', [patient('Mesmo nome')]).result;
  const b = second.service.command('addPatient', [
    patient('Mesmo nome'),
  ]).result;
  assert.notEqual(a.id, b.id);
  assert.notEqual(a.code, b.code);
  first.db.close();
  second.db.close();
});
