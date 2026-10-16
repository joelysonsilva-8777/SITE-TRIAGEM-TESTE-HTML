import type { Patient } from '../data/types';
export const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export const initials = (name: string) => {
  const n = name.trim().split(/\s+/);
  return (
    (n[0]?.[0] || '?') + (n.length > 1 ? n[n.length - 1][0] : '')
  ).toUpperCase();
};
export const age = (birth: string) => {
  if (!birth) return 'Idade não informada';
  const d = new Date(birth + 'T12:00:00');
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  )
    a--;
  return `${a} anos`;
};
export const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = (d: string) => localDate(new Date(d)) === localDate();
export const waitMinutes = (p: Patient) =>
  Math.max(0, Math.floor((Date.now() - Date.parse(p.arrivalAt)) / 60000));
export const duration = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
export const queue = (patients: Patient[]) =>
  patients
    .filter((p) => p.status === 'waiting')
    .sort(
      (a, b) =>
        ['red', 'orange', 'yellow', 'green', 'blue'].indexOf(a.risk!) -
          ['red', 'orange', 'yellow', 'green', 'blue'].indexOf(b.risk!) ||
        Date.parse(a.arrivalAt) - Date.parse(b.arrivalAt),
    );
export const availability = {
  available: 'Disponível',
  busy: 'Em atendimento',
  break: 'Em pausa',
};
export const vitalFields = [
  {
    key: 'systolic',
    label: 'Pressão sistólica',
    unit: 'mmHg',
    min: 0,
    max: 350,
  },
  {
    key: 'diastolic',
    label: 'Pressão diastólica',
    unit: 'mmHg',
    min: 0,
    max: 250,
  },
  {
    key: 'heartRate',
    label: 'Frequência cardíaca',
    unit: 'bpm',
    min: 0,
    max: 300,
  },
  { key: 'temperature', label: 'Temperatura', unit: '°C', min: 20, max: 50 },
  { key: 'spo2', label: 'Saturação de O₂', unit: '%', min: 0, max: 100 },
  {
    key: 'respiratoryRate',
    label: 'Frequência respiratória',
    unit: 'irpm',
    min: 0,
    max: 120,
  },
  { key: 'pain', label: 'Dor informada', unit: '0 a 10', min: 0, max: 10 },
] as const;
