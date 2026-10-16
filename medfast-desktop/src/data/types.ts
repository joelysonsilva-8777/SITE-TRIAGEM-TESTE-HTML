export type Status = 'triage' | 'waiting' | 'attending' | 'finished';
export type RiskId = 'red' | 'orange' | 'yellow' | 'green' | 'blue';
export type VitalKey =
  | 'systolic'
  | 'diastolic'
  | 'heartRate'
  | 'temperature'
  | 'spo2'
  | 'respiratoryRate'
  | 'pain';
export type Vitals = Record<VitalKey, number | null>;
export interface Patient {
  id: string;
  code: string;
  name: string;
  birthDate: string;
  sex: string;
  phone: string;
  complaint: string;
  allergies: string;
  risk: RiskId | null;
  status: Status;
  arrivalAt: string;
  triagedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  professional: string;
  room: string;
  notes: string;
  outcome?: string;
  vitals: Vitals;
  history: { at: string; text: string }[];
}
export interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'available' | 'busy' | 'break';
  initials: string;
  color: string;
  shift: string;
}
export interface Risk {
  id: RiskId;
  label: string;
  short: string;
  rank: number;
  color: string;
}
export interface Snapshot {
  patients: Patient[];
  staff: Staff[];
  events: {
    id: string;
    patientId: string;
    at: string;
    text: string;
    type: string;
  }[];
  settings: { hospital: string; unit: string; userName: string };
}
export type Page =
  | 'dashboard'
  | 'pacientes'
  | 'triagem'
  | 'fila'
  | 'atendimentos'
  | 'equipe'
  | 'relatorios';
export type Dialog =
  | {
      kind:
        'new' | 'edit' | 'detail' | 'call' | 'assign' | 'evolution' | 'finish';
      id?: string;
    }
  | {
      kind:
        | 'profile'
        | 'unit'
        | 'help'
        | 'events'
        | 'search'
        | 'shifts'
        | 'reset'
        | 'staff-new';
    }
  | { kind: 'staff'; id: string };
