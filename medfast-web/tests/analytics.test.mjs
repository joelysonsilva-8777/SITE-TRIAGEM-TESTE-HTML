import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rangeError,
  volumeSeries,
  averageMinutes,
  inRange,
} from '../src/lib/analytics.ts';
test('períodos rejeitam datas inexistentes, futuras e intervalos invertidos', () => {
  assert.ok(rangeError('2024-02-31', '2024-03-01'));
  assert.ok(rangeError('2024-03-02', '2024-03-01'));
  assert.ok(rangeError('2024-03-01', '2099-01-01'));
  assert.equal(rangeError('2024-02-29', '2024-03-01'), '');
});
test('gráficos respeitam limites locais do dia e preservam totais em intervalos extensos', () => {
  const patients = [
    {
      arrivalAt: new Date('2024-03-01T00:00:00').toISOString(),
      finishedAt: new Date('2024-03-01T23:59:59').toISOString(),
    },
    {
      arrivalAt: new Date('2024-03-01T23:59:59').toISOString(),
      finishedAt: new Date('2024-03-02T00:00:00').toISOString(),
    },
  ];
  const day = volumeSeries(patients, '2024-03-01', '2024-03-01');
  assert.equal(day.length, 8);
  assert.equal(
    day.reduce((sum, p) => sum + p.arrivals, 0),
    2,
  );
  assert.equal(
    day.reduce((sum, p) => sum + p.finished, 0),
    1,
  );
  const long = volumeSeries(patients, '1900-01-01', '2024-03-02');
  assert.ok(long.length <= 24);
  assert.equal(
    long.reduce((sum, p) => sum + p.finished, 0),
    2,
  );
  assert.equal(
    inRange(patients[1].finishedAt, '2024-03-01', '2024-03-01'),
    false,
  );
});
test('médias excluem horários ausentes e calculam somente pares completos', () => {
  const patients = [
    {
      arrivalAt: '2024-03-01T10:00:00Z',
      startedAt: '2024-03-01T10:20:00Z',
      finishedAt: '2024-03-01T10:40:00Z',
    },
    { arrivalAt: '2024-03-01T10:00:00Z', startedAt: null, finishedAt: null },
    {
      arrivalAt: '2024-03-01T10:00:00Z',
      startedAt: '2024-03-01T10:40:00Z',
      finishedAt: null,
    },
  ];
  assert.equal(averageMinutes(patients, 'arrivalAt', 'startedAt'), 30);
  assert.equal(averageMinutes(patients, 'startedAt', 'finishedAt'), 20);
  assert.equal(averageMinutes([], 'startedAt', 'finishedAt'), null);
});
