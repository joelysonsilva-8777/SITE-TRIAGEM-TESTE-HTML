import { DatabaseSync } from 'node:sqlite';
import {
  randomUUID,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const emptySnapshot = () => ({
  patients: [],
  staff: [],
  events: [],
  settings: {
    hospital: 'Minha unidade',
    unit: 'Pronto atendimento',
    userName: 'Usuário local',
  },
});
const groups = ['patients', 'staff', 'events', 'settings'];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const recordKey = (kind, id) => `${kind}_${id}`;
export function validateRecord(record) {
  if (
    !record ||
    !groups.includes(record.kind) ||
    !/^[a-zA-Z0-9_-]{1,160}$/.test(record.id) ||
    !record.payload ||
    typeof record.payload !== 'object' ||
    Array.isArray(record.payload)
  )
    throw new Error('Registro recebido inválido.');
  const p = record.payload;
  if (
    record.kind === 'patients' &&
    (p.id !== record.id ||
      typeof p.name !== 'string' ||
      !['triage', 'waiting', 'attending', 'finished'].includes(p.status) ||
      !Array.isArray(p.history) ||
      !p.vitals ||
      !Number.isFinite(Date.parse(p.arrivalAt)))
  )
    throw new Error('Paciente recebido inválido.');
  if (
    record.kind === 'staff' &&
    (p.id !== record.id ||
      typeof p.name !== 'string' ||
      typeof p.role !== 'string' ||
      !['available', 'busy', 'break'].includes(p.status))
  )
    throw new Error('Profissional recebido inválido.');
  if (
    record.kind === 'events' &&
    (p.id !== record.id ||
      typeof p.patientId !== 'string' ||
      typeof p.text !== 'string' ||
      !Number.isFinite(Date.parse(p.at)))
  )
    throw new Error('Evento recebido inválido.');
  if (
    record.kind === 'settings' &&
    (record.id !== 'unit' ||
      typeof p.hospital !== 'string' ||
      typeof p.unit !== 'string')
  )
    throw new Error('Unidade recebida inválida.');
  if (Buffer.byteLength(JSON.stringify(p)) > 650000)
    throw new Error(
      'Registro excede o tamanho permitido. Exporte o histórico antes de continuar.',
    );
}
export class LocalDatabase {
  constructor(file, codec) {
    this.codec = codec;
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS outbox (key TEXT PRIMARY KEY, opId TEXT NOT NULL, baseVersion INTEGER NOT NULL, body TEXT NOT NULL, blocked INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, nextAt INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS conflicts (key TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS resolutions (id TEXT PRIMARY KEY, body TEXT NOT NULL);
    `);
    if (!this.getMeta('deviceId')) this.setMeta('deviceId', randomUUID());
    if (!this.getMeta('snapshot')) {
      const initial = emptySnapshot();
      this.setMeta('snapshot', initial);
      this.db
        .prepare('INSERT OR IGNORE INTO records VALUES (?, ?, ?, ?, 0)')
        .run(
          'settings_unit',
          'settings',
          'unit',
          this.encode({
            hospital: initial.settings.hospital,
            unit: initial.settings.unit,
          }),
        );
    }
  }
  encode(value) {
    return this.codec.encrypt(JSON.stringify(value));
  }
  decode(value) {
    return JSON.parse(this.codec.decrypt(value));
  }
  getMeta(key) {
    const row = this.db.prepare('SELECT body FROM meta WHERE key=?').get(key);
    return row ? this.decode(row.body) : null;
  }
  setMeta(key, value) {
    this.db
      .prepare(
        'INSERT INTO meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET body=excluded.body',
      )
      .run(key, this.encode(value));
  }
  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = action();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  snapshot() {
    return this.getMeta('snapshot');
  }
  commitSnapshot(snapshot) {
    this.transaction(() => {
      const entries = [];
      for (const kind of ['patients', 'staff', 'events'])
        for (const payload of snapshot[kind])
          entries.push({ kind, id: payload.id, payload });
      entries.push({
        kind: 'settings',
        id: 'unit',
        payload: {
          hospital: snapshot.settings.hospital,
          unit: snapshot.settings.unit,
        },
      });
      for (const entry of entries) {
        validateRecord(entry);
        const key = recordKey(entry.kind, entry.id);
        const old = this.db
          .prepare('SELECT * FROM records WHERE key=?')
          .get(key);
        if (old && equal(this.decode(old.body), entry.payload)) continue;
        const body = this.encode(entry.payload);
        this.db
          .prepare(
            'INSERT INTO records VALUES (?, ?, ?, ?, 0) ON CONFLICT(key) DO UPDATE SET body=excluded.body',
          )
          .run(key, entry.kind, entry.id, body);
        const conflict = this.db
          .prepare('SELECT body FROM conflicts WHERE key=?')
          .get(key);
        const previous = this.db
          .prepare('SELECT baseVersion FROM outbox WHERE key=?')
          .get(key);
        this.db
          .prepare(
            'INSERT INTO outbox VALUES (?, ?, ?, ?, ?, 0, 0, ?) ON CONFLICT(key) DO UPDATE SET opId=excluded.opId, body=excluded.body, attempts=0, nextAt=0',
          )
          .run(
            key,
            randomUUID(),
            previous?.baseVersion ?? old?.version ?? 0,
            body,
            conflict ? 1 : 0,
            '',
          );
        if (conflict) {
          const detail = this.decode(conflict.body);
          detail.local = entry.payload;
          this.db
            .prepare('UPDATE conflicts SET body=? WHERE key=?')
            .run(this.encode(detail), key);
        }
      }
      this.setMeta('snapshot', snapshot);
    });
  }
  rebuild() {
    const current = this.snapshot();
    const next = {
      patients: [],
      staff: [],
      events: [],
      settings: current.settings,
    };
    for (const row of this.db
      .prepare('SELECT * FROM records ORDER BY rowid')
      .all()) {
      const payload = this.decode(row.body);
      if (row.kind === 'settings')
        next.settings = { ...payload, userName: current.settings.userName };
      else next[row.kind].push(payload);
    }
    next.patients.sort(
      (a, b) => Date.parse(b.arrivalAt) - Date.parse(a.arrivalAt),
    );
    next.events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    this.setMeta('snapshot', next);
  }
  pending(now = Date.now()) {
    return this.db
      .prepare(
        "SELECT o.*, r.kind, r.id FROM outbox o JOIN records r USING(key) WHERE blocked=0 AND nextAt<=? ORDER BY CASE r.kind WHEN 'patients' THEN 0 WHEN 'staff' THEN 1 WHEN 'events' THEN 2 ELSE 3 END, o.rowid LIMIT 150",
      )
      .all(now)
      .map((row) => ({ ...row, payload: this.decode(row.body) }));
  }
  acknowledge(operation, version) {
    this.transaction(() => {
      const pending = this.db
        .prepare('SELECT * FROM outbox WHERE key=?')
        .get(operation.key);
      this.db
        .prepare('UPDATE records SET version=MAX(version, ?) WHERE key=?')
        .run(version, operation.key);
      if (pending?.opId === operation.opId)
        this.db.prepare('DELETE FROM outbox WHERE key=?').run(operation.key);
      else if (pending)
        this.db
          .prepare(
            'UPDATE outbox SET baseVersion=MAX(baseVersion, ?), nextAt=0, attempts=0 WHERE key=?',
          )
          .run(version, operation.key);
    });
  }
  receive(records) {
    this.transaction(() => {
      for (const remote of records) {
        validateRecord(remote);
        if (!Number.isInteger(remote.version) || remote.version < 1)
          throw new Error('Versão remota inválida.');
        const key = recordKey(remote.kind, remote.id);
        const old = this.db
          .prepare('SELECT * FROM records WHERE key=?')
          .get(key);
        const pending = this.db
          .prepare('SELECT * FROM outbox WHERE key=?')
          .get(key);
        if (old && remote.version <= old.version) continue;
        if (pending) {
          if (pending.opId === remote.opId) {
            this.db.prepare('DELETE FROM outbox WHERE key=?').run(key);
          } else if (remote.version > pending.baseVersion) {
            this.db
              .prepare(
                'INSERT INTO conflicts VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET body=excluded.body',
              )
              .run(
                key,
                this.encode({
                  key,
                  kind: remote.kind,
                  id: remote.id,
                  local: this.decode(old.body),
                  remote: remote.payload,
                  remoteVersion: remote.version,
                  detectedAt: new Date().toISOString(),
                }),
              );
            this.db.prepare('UPDATE outbox SET blocked=1 WHERE key=?').run(key);
            continue;
          } else continue;
        }
        this.db
          .prepare(
            'INSERT INTO records VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET body=excluded.body, version=excluded.version',
          )
          .run(
            key,
            remote.kind,
            remote.id,
            this.encode(remote.payload),
            remote.version,
          );
      }
      this.rebuild();
    });
  }
  conflict(operation, remote) {
    this.receive([remote]);
    // A remote removal is not supported by the server rules.
    if (!this.conflicts().some((item) => item.key === operation.key))
      throw new Error('Não foi possível registrar o conflito.');
  }
  conflicts() {
    return this.db
      .prepare('SELECT body FROM conflicts ORDER BY rowid')
      .all()
      .map((row) => this.decode(row.body));
  }
  resolve(key, choice) {
    if (!['local', 'remote'].includes(choice))
      throw new Error('Escolha uma resolução válida.');
    this.transaction(() => {
      const row = this.db
        .prepare('SELECT body FROM conflicts WHERE key=?')
        .get(key);
      if (!row) throw new Error('Conflito não encontrado.');
      const conflict = this.decode(row.body);
      this.db.prepare('INSERT INTO resolutions VALUES (?, ?)').run(
        randomUUID(),
        this.encode({
          ...conflict,
          choice,
          resolvedAt: new Date().toISOString(),
        }),
      );
      if (choice === 'remote') {
        this.db
          .prepare('UPDATE records SET body=?, version=? WHERE key=?')
          .run(this.encode(conflict.remote), conflict.remoteVersion, key);
        this.db.prepare('DELETE FROM outbox WHERE key=?').run(key);
      } else {
        const local = this.db
          .prepare('SELECT body FROM records WHERE key=?')
          .get(key);
        this.db
          .prepare(
            'UPDATE outbox SET opId=?, baseVersion=?, body=?, blocked=0, attempts=0, nextAt=0, error=? WHERE key=?',
          )
          .run(randomUUID(), conflict.remoteVersion, local.body, '', key);
        this.db
          .prepare('UPDATE records SET version=? WHERE key=?')
          .run(conflict.remoteVersion, key);
      }
      this.db.prepare('DELETE FROM conflicts WHERE key=?').run(key);
      this.rebuild();
    });
  }
  retry(operation, message, permanent = false) {
    const attempts = operation.attempts + 1;
    this.db
      .prepare(
        'UPDATE outbox SET attempts=?, nextAt=?, error=?, blocked=? WHERE key=? AND opId=?',
      )
      .run(
        attempts,
        Date.now() + Math.min(300000, 2000 * 2 ** Math.min(attempts, 8)),
        String(message).slice(0, 500),
        permanent ? 2 : 0,
        operation.key,
        operation.opId,
      );
  }
  retryAll() {
    this.db
      .prepare(
        'UPDATE outbox SET blocked=0, nextAt=0, attempts=0, error=? WHERE blocked<>1',
      )
      .run('');
  }
  status() {
    const counts = this.db
      .prepare(
        'SELECT COUNT(*) pending, SUM(CASE WHEN blocked=2 THEN 1 ELSE 0 END) errors FROM outbox',
      )
      .get();
    return {
      pending: counts.pending,
      errors: counts.errors || 0,
      conflicts: this.conflicts().length,
    };
  }
  drafts() {
    return Object.fromEntries(
      this.db
        .prepare('SELECT * FROM drafts')
        .all()
        .map((row) => [row.id, this.decode(row.body)]),
    );
  }
  saveDraft(id, value) {
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id))
      throw new Error('Rascunho inválido.');
    if (value === null)
      this.db.prepare('DELETE FROM drafts WHERE id=?').run(id);
    else {
      if (JSON.stringify(value).length > 50000)
        throw new Error('Rascunho muito grande.');
      this.db
        .prepare(
          'INSERT INTO drafts VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
        )
        .run(id, this.encode(value));
    }
  }
  exportState() {
    return {
      format: 'clara-desktop-v1',
      tables: Object.fromEntries(
        ['records', 'outbox', 'conflicts', 'drafts', 'resolutions'].map(
          (table) => [
            table,
            this.db
              .prepare(`SELECT * FROM ${table}`)
              .all()
              .map((row) => ({
                ...row,
                ...(row.body ? { body: this.decode(row.body) } : {}),
              })),
          ],
        ),
      ),
      meta: Object.fromEntries(
        ['snapshot', 'deviceId', 'binding', 'lastSync'].map((key) => [
          key,
          this.getMeta(key),
        ]),
      ),
    };
  }
  restoreState(data) {
    if (
      data?.format !== 'clara-desktop-v1' ||
      !data.tables ||
      !data.meta?.snapshot
    )
      throw new Error('Backup inválido.');
    for (const row of data.tables.records || [])
      validateRecord({ ...row, payload: row.body });
    this.transaction(() => {
      const columns = {
        records: ['key', 'kind', 'id', 'body', 'version'],
        outbox: [
          'key',
          'opId',
          'baseVersion',
          'body',
          'blocked',
          'attempts',
          'nextAt',
          'error',
        ],
        conflicts: ['key', 'body'],
        drafts: ['id', 'body'],
        resolutions: ['id', 'body'],
      };
      for (const [table, keys] of Object.entries(columns)) {
        if (!Array.isArray(data.tables[table]))
          throw new Error('Tabela do backup inválida.');
        this.db.exec(`DELETE FROM ${table}`);
        const insert = this.db.prepare(
          `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        );
        for (const row of data.tables[table])
          insert.run(
            ...keys.map((key) =>
              key === 'body' ? this.encode(row[key]) : row[key],
            ),
          );
      }
      for (const [key, value] of Object.entries(data.meta))
        if (['snapshot', 'binding', 'lastSync'].includes(key))
          this.setMeta(key, value);
      // A restored installation gets a new device ID but keeps operation IDs for idempotency.
      this.setMeta('deviceId', randomUUID());
      this.setMeta('session', null);
      this.rebuild();
    });
  }
  close() {
    this.db.close();
  }
}
export function encryptBackup(data, password) {
  if (typeof password !== 'string' || password.length < 12)
    throw new Error('Use uma senha de backup com pelo menos 12 caracteres.');
  const salt = randomBytes(16),
    iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    scryptSync(password, salt, 32),
    iv,
  );
  const content = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final(),
  ]);
  return JSON.stringify({
    format: 'clara-backup-aes256-v1',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    content: content.toString('base64'),
  });
}
export function decryptBackup(raw, password) {
  try {
    const data = JSON.parse(raw);
    if (data.format !== 'clara-backup-aes256-v1') throw new Error();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      scryptSync(password, Buffer.from(data.salt, 'base64'), 32),
      Buffer.from(data.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(data.content, 'base64')),
        decipher.final(),
      ]).toString(),
    );
  } catch {
    throw new Error('Senha incorreta ou arquivo de backup inválido.');
  }
}
