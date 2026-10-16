import type { Patient } from '../data/types';
import { localDate } from './format.ts';

export interface Bucket {
  label: string;
  arrivals: number;
  finished: number;
}
export function dateRange(preset: string) {
  const end = new Date();
  const start = new Date();
  start.setDate(
    start.getDate() - (preset === '30' ? 29 : preset === '7' ? 6 : 0),
  );
  return { from: localDate(start), to: localDate(end) };
}
export function rangeError(from: string, to: string) {
  const valid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !isNaN(Date.parse(value)) &&
    localDate(new Date(value + 'T12:00:00')) === value;
  if (!valid(from) || !valid(to)) return 'Informe duas datas válidas.';
  if (from > to) return 'A data inicial deve ser anterior ou igual à final.';
  if (from < '1900-01-01' || to > localDate())
    return 'Escolha datas entre 1900 e hoje.';
  return '';
}
export function inRange(value: string | null, from: string, to: string) {
  if (!value) return false;
  const day = localDate(new Date(value));
  return day >= from && day <= to;
}
export function volumeSeries(
  patients: Patient[],
  from: string,
  to: string,
): Bucket[] {
  if (rangeError(from, to)) return [];
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59.999');
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  // Limit to 24 buckets even for very long custom intervals.
  const step = Math.max(1, Math.ceil(days / 24));
  const buckets: Bucket[] = [];
  while (start <= end) {
    const next = new Date(start);
    if (days === 1) next.setHours(next.getHours() + 3);
    else next.setDate(next.getDate() + step);
    const inside = (v: string | null) =>
      !!v &&
      Date.parse(v) >= +start &&
      Date.parse(v) < Math.min(+next, +end + 1);
    buckets.push({
      label:
        days === 1
          ? start.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : start.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              ...(days > 365 ? { year: '2-digit' as const } : {}),
            }),
      arrivals: patients.filter((p) => inside(p.arrivalAt)).length,
      finished: patients.filter((p) => inside(p.finishedAt)).length,
    });
    start.setTime(+next);
  }
  return buckets;
}
export function averageMinutes(
  patients: Patient[],
  from: 'arrivalAt' | 'startedAt',
  to: 'startedAt' | 'finishedAt',
) {
  const values = patients.flatMap((p) =>
    p[from] && p[to]
      ? [Math.max(0, (Date.parse(p[to]!) - Date.parse(p[from]!)) / 60000)]
      : [],
  );
  return values.length
    ? Math.round(values.reduce((sum, n) => sum + n, 0) / values.length)
    : null;
}
