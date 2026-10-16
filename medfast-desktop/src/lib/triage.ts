import type { Patient, RiskId, VitalKey } from '../data/types';
import { identityOf, type Identity } from './identity';
import { getDesktop } from '../data/store';

export interface TriageDraft extends Identity {
  id: string;
  step: number;
  risk: RiskId | '';
  nurse: string;
  rationale: string;
  destination: 'waiting' | 'attending';
  doctor: string;
  room: string;
  vitals: Record<VitalKey, string>;
}

export function freshDraft(p: Patient): TriageDraft {
  return {
    ...identityOf(p),
    id: p.id,
    step: 0,
    risk: '',
    nurse: '',
    rationale: '',
    destination: 'waiting',
    doctor: '',
    room: '',
    vitals: {
      systolic: '',
      diastolic: '',
      heartRate: '',
      temperature: '',
      spo2: '',
      respiratoryRate: '',
      pain: '',
    },
  };
}
export function readDraft(p: Patient) {
  const fresh = freshDraft(p);
  try {
    const raw = getDesktop().drafts[p.id] as TriageDraft;
    if (!raw || raw.id !== p.id || !raw.vitals) return fresh;
    const values = { ...fresh };
    for (const key of [
      'name',
      'birthDate',
      'sex',
      'phone',
      'complaint',
      'allergies',
      'rationale',
      'nurse',
      'doctor',
      'room',
    ] as const) {
      if (typeof raw[key] === 'string') values[key] = raw[key];
    }
    if (['red', 'orange', 'yellow', 'green', 'blue', ''].includes(raw.risk))
      values.risk = raw.risk;
    values.step = [0, 1, 2].includes(raw.step) ? raw.step : 0;
    values.destination =
      raw.destination === 'attending' && values.risk === 'red'
        ? 'attending'
        : 'waiting';
    for (const key of Object.keys(values.vitals) as VitalKey[])
      if (typeof raw.vitals[key] === 'string')
        values.vitals[key] = raw.vitals[key];
    return values;
  } catch {
    return fresh;
  }
}
export async function saveDraft(draft: TriageDraft | null, id: string) {
  if (draft) getDesktop().drafts[id] = draft;
  else delete getDesktop().drafts[id];
  try {
    await window.clara.saveDraft(id, draft);
    return true;
  } catch {
    return false;
  }
}
