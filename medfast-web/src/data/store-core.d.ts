import { Patient, Risk, Snapshot, Staff, Status } from './types';
export interface Store {
  version: number;
  risks: Risk[];
  statuses: Record<Status, string>;
  storageAvailable: boolean;
  storageError: string;
  get(): Snapshot;
  patients(): Patient[];
  staff(): Staff[];
  patient(id: string): Patient | null;
  risk(id: string | null): Risk | null;
  addPatient(fields: Partial<Patient>): Patient;
  updatePatient(id: string, fields: Partial<Patient>): Patient | null;
  addEvent(id: string, text: string): unknown;
  updateStaff(id: string, fields: Partial<Staff>): Staff | null;
  updateSettings(fields: Partial<Snapshot['settings']>): Snapshot['settings'];
  exportCSV(patients?: Patient[]): string;
  reset(): Snapshot;
  sync(raw: string): boolean;
}
export function createStore(
  storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  },
  onEvent?: (event: { type: string; detail: unknown }) => void,
): Store;
