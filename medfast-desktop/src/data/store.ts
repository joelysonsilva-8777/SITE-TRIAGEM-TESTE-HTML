import { useSyncExternalStore } from 'react';
import { createStore } from './store-core.js';
import type { DesktopState } from './desktop';
import type { Patient, Staff, Snapshot } from './types';
const listeners = new Set<() => void>();
let desktop: DesktopState;
let core: ReturnType<typeof createStore>;
export function acceptState(value: DesktopState) {
  desktop = value;
  const raw = JSON.stringify({ version: 1, data: value.snapshot });
  if (!core) core = createStore({ getItem: () => raw, setItem: () => {} });
  else core.sync(raw);
  listeners.forEach((listener) => listener());
}
export async function initializeStore() {
  if (!window.clara)
    throw new Error(
      'Abra o MedFast pelo aplicativo Windows. A interface depende do banco local do aplicativo.',
    );
  acceptState(await window.clara.load());
  window.clara.onState(acceptState);
  window.addEventListener('online', () => {
    void window.clara.sync().then(acceptState);
  });
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useStore = () =>
  useSyncExternalStore(subscribe, () => desktop.snapshot);
export const useDesktop = () => useSyncExternalStore(subscribe, () => desktop);
export const getDesktop = () => desktop;
async function command<T>(method: string, ...args: unknown[]): Promise<T> {
  const response = await window.clara.command(method, args);
  acceptState(response.state);
  return response.result as T;
}
export const store = {
  get risks() {
    return core.risks;
  },
  get statuses() {
    return core.statuses;
  },
  get storageAvailable() {
    return true;
  },
  get storageError() {
    return '';
  },
  get: () => core.get(),
  patients: () => core.patients(),
  staff: () => core.staff(),
  patient: (id: string) => core.patient(id),
  risk: (id: string | null) => core.risk(id),
  addPatient: (value: Partial<Patient>) =>
    command<Patient>('addPatient', value),
  updatePatient: (id: string, value: Partial<Patient>) =>
    command<Patient>('updatePatient', id, value),
  updateWithEvent: (id: string, value: Partial<Patient>, event: string) =>
    command<Patient>('updateWithEvent', id, value, event),
  addEvent: (id: string, text: string) => command('addEvent', id, text),
  addStaff: (value: Pick<Staff, 'name' | 'role' | 'department' | 'shift'>) =>
    command<Staff>('addStaff', value),
  updateStaff: (id: string, value: Partial<Staff>) =>
    command<Staff>('updateStaff', id, value),
  updateSettings: (value: Partial<Snapshot['settings']>) =>
    command<Snapshot['settings']>('updateSettings', value),
  exportCSV: (patients?: Patient[]) => core.exportCSV(patients),
};
export function downloadCSV(
  patients = store.patients(),
  filename = 'medfast-pacientes.csv',
) {
  const url = URL.createObjectURL(
    new Blob([store.exportCSV(patients)], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
