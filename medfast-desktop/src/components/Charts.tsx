import type { Patient } from '../data/types';
import type { Bucket } from '../lib/analytics';
import { store } from '../data/store';

export function FlowChart({ series }: { series: Bucket[] }) {
  const maximum = Math.max(
    4,
    ...series.flatMap((s) => [s.arrivals, s.finished]),
  );
  const ceiling = Math.ceil(maximum / 4) * 4;
  const x = (i: number) => 35 + (i * 590) / Math.max(1, series.length - 1);
  const y = (n: number) => 160 - (n / ceiling) * 135;
  const path = (key: 'arrivals' | 'finished') =>
    series.map((s, i) => `${i ? 'L' : 'M'}${x(i)} ${y(s[key])}`).join(' ');
  return (
    <>
      <div className="chart-legend">
        <span>
          <span className="legend-dot" />
          Entradas
        </span>
        <span>
          <span className="legend-dot light" />
          Atendimentos concluídos
        </span>
      </div>
      <div className="rw-chart">
        <svg
          viewBox="0 0 660 200"
          role="img"
          aria-label="Entradas e conclusões no período. Os valores estão disponíveis na tabela abaixo."
        >
          {[0, 1, 2, 3, 4].map((n) => (
            <g key={n}>
              <line
                x1="35"
                x2="625"
                y1={y((n * ceiling) / 4)}
                y2={y((n * ceiling) / 4)}
                stroke="#dce3e5"
                strokeDasharray="2 4"
              />
              <text x="23" y={y((n * ceiling) / 4) + 4} textAnchor="end">
                {(n * ceiling) / 4}
              </text>
            </g>
          ))}
          <path
            d={path('finished')}
            fill="none"
            stroke="#986616"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <path
            d={path('arrivals')}
            fill="none"
            stroke="#0648D7"
            strokeWidth="2.5"
          />
          {series.map((s, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(s.arrivals)} r="3" fill="#0648D7">
                <title>
                  {s.label}: {s.arrivals} entradas, {s.finished} conclusões
                </title>
              </circle>
              {(series.length <= 8 ||
                i % Math.ceil(series.length / 8) === 0 ||
                i === series.length - 1) && (
                <text x={x(i)} y="187" textAnchor="middle">
                  {s.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="chart-summary">
        <span>Movimentação no período</span>
        <strong>{series.reduce((n, s) => n + s.arrivals, 0)} entradas</strong>
      </div>
      <details className="chart-data-details">
        <summary>Consultar dados do gráfico</summary>
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Entradas e conclusões</caption>
            <thead>
              <tr>
                <th>Período</th>
                <th>Entradas</th>
                <th>Conclusões</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s, i) => (
                <tr key={i}>
                  <th scope="row">{s.label}</th>
                  <td>{s.arrivals}</td>
                  <td>{s.finished}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
export function RiskChart({ patients }: { patients: Patient[] }) {
  const counts = store.risks.map((r) => ({
    ...r,
    count: patients.filter((p) => p.risk === r.id).length,
  }));
  const max = Math.max(1, ...counts.map((r) => r.count));
  return (
    <div className="risk-distribution">
      {counts.map((r) => (
        <div className="risk-breakdown-row" key={r.id}>
          <span>{r.label}</span>
          <div className="risk-track" aria-hidden="true">
            <span
              style={{
                width: `${(100 * r.count) / max}%`,
                background: r.color,
                minWidth: 0,
              }}
            />
          </div>
          <strong>{String(r.count).padStart(2, '0')}</strong>
        </div>
      ))}
    </div>
  );
}
