import { createStore } from '../src/data/store-core.js';
import { randomUUID } from 'node:crypto';

export class AppService {
  constructor(database, cloud, sync, onChange = () => {}) {
    this.local = database;
    this.cloud = cloud;
    this.sync = sync;
    this.onChange = onChange;
  }
  state() {
    return {
      snapshot: this.local.snapshot(),
      sync: this.sync.status(),
      conflicts: this.local.conflicts(),
      drafts: this.local.drafts(),
      config: {
        projectId: this.cloud.config.projectId,
        unitId: this.cloud.config.unitId,
        adminEmail: 'admin@clara.local',
      },
    };
  }
  notify() {
    this.onChange(this.state());
  }
  assertEditor() {
    if (['viewer', 'blocked'].includes(this.cloud.publicSession()?.role))
      throw new Error('Esta conta não tem permissão para editar registros.');
  }
  command(method, args) {
    this.assertEditor();
    if (!Array.isArray(args) || JSON.stringify(args).length > 800000)
      throw new Error('Comando inválido.');
    const before = this.local.snapshot();
    let raw = JSON.stringify({ version: 1, data: before });
    const core = createStore({
      getItem: () => raw,
      setItem: (_key, value) => {
        raw = value;
      },
    });
    let result;
    if (method === 'addPatient') {
      result = core.addPatient(args[0]);
      const value = core.get();
      const patient = value.patients.find((item) => item.id === result.id);
      patient.code = `CL-${this.local.getMeta('deviceId').slice(0, 6).toUpperCase()}-${patient.id.slice(-10).toUpperCase()}`;
      core.sync(JSON.stringify({ version: 1, data: value }));
      result = patient;
    } else if (method === 'updateWithEvent') {
      result = core.updatePatient(args[0], args[1]);
      if (!result) throw new Error('Paciente não encontrado.');
      core.addEvent(args[0], args[2]);
    } else if (method === 'addStaff') {
      const fields = args[0];
      if (
        !fields ||
        !['name', 'role', 'department', 'shift'].every(
          (key) =>
            typeof fields[key] === 'string' &&
            fields[key].trim().length >= 2 &&
            fields[key].length <= 150,
        )
      )
        throw new Error('Preencha nome, função, setor e plantão.');
      const parts = fields.name.trim().split(/\s+/);
      result = {
        id: `staff_${randomUUID().replace(/-/g, '')}`,
        name: fields.name.trim(),
        role: fields.role.trim(),
        department: fields.department.trim(),
        shift: fields.shift.trim(),
        status: 'available',
        initials: (parts[0][0] + (parts.at(-1)?.[0] || '')).toUpperCase(),
        color: 'sage',
      };
      const next = core.get();
      next.staff.push(result);
      if (!core.sync(JSON.stringify({ version: 1, data: next })))
        throw new Error('O limite de profissionais desta versão foi atingido.');
    } else if (
      ['updatePatient', 'addEvent', 'updateStaff', 'updateSettings'].includes(
        method,
      )
    ) {
      if (
        method === 'updateSettings' &&
        this.cloud.publicSession()?.role === 'editor' &&
        (args[0].hospital !== before.settings.hospital ||
          args[0].unit !== before.settings.unit)
      )
        throw new Error('Somente administradores podem alterar a unidade.');
      result = core[method](...args);
      if (result === null) throw new Error('Registro não encontrado.');
    } else throw new Error('Ação não permitida.');
    const next = core.get();
    if (!core.sync(JSON.stringify({ version: 1, data: next })))
      throw new Error(
        'O limite de registros desta versão foi atingido. Faça um backup e solicite suporte.',
      );
    this.local.commitSnapshot(next);
    this.notify();
    // Local transaction is committed before the IPC response; network never blocks saving.
    setTimeout(() => void this.sync.run(), 250).unref?.();
    return { result, state: this.state() };
  }
}
