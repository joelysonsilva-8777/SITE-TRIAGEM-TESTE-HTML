import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, useStore } from '../data/store';
import {
  averageMinutes,
  dateRange,
  inRange,
  rangeError,
  volumeSeries,
} from '../lib/analytics';
import { localDate } from '../lib/format';
import { useFeedback } from '../components/Feedback';
import {
  Button,
  Card,
  Input,
  Metrics,
  Notice,
  PageHeading,
  Pagination,
  Select,
} from '../components/UI';
import { FlowChart, RiskChart } from '../components/Charts';
import { PatientTable } from '../components/PatientTable';

export default function Reports() {
  const { patients, settings } = useStore();
  const { notify } = useFeedback();
  const [preset, setPreset] = useState('7');
  const [range, setRange] = useState(() => dateRange('7'));
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const selected = patients.filter((p) =>
    inRange(p.arrivalAt, range.from, range.to),
  );
  const concluded = selected.filter((p) => p.status === 'finished');
  const wait = averageMinutes(selected, 'arrivalAt', 'startedAt');
  const care = averageMinutes(selected, 'startedAt', 'finishedAt');
  const current = Math.min(page, Math.max(1, Math.ceil(selected.length / 8)));
  const readable = (v: string) =>
    new Date(v + 'T12:00:00').toLocaleDateString('pt-BR');
  return (
    <>
      <PageHeading
        title="Olhar os dados. Melhorar o cuidado."
        eyebrow="RELATÓRIOS DA UNIDADE"
        description="Acompanhe o movimento da unidade e transforme registros em uma visão compartilhada."
      >
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={17} />
          Imprimir relatório
        </Button>
        <Button
          onClick={() => {
            downloadCSV(
              selected,
              `medfast-relatorio-${range.from}-${range.to}.csv`,
            );
            notify('Exportação do relatório iniciada.');
          }}
        >
          <Download size={17} />
          Exportar CSV
        </Button>
      </PageHeading>
      <Card className="rw-print-hide">
        <form
          className="rw-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            const message = rangeError(draft.from, draft.to);
            setError(message);
            if (!message) {
              setRange(draft);
              setPage(1);
            }
          }}
        >
          <Select
            label="Período"
            value={preset}
            onChange={(e) => {
              const p = e.target.value;
              setPreset(p);
              setError('');
              if (p !== 'custom') {
                const next = dateRange(p);
                setRange(next);
                setDraft(next);
                setPage(1);
              }
            }}
          >
            <option value="today">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="custom">Personalizado</option>
          </Select>
          {preset === 'custom' && (
            <>
              <Input
                label="Data inicial"
                type="date"
                min="1900-01-01"
                max={localDate()}
                required
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
              <Input
                label="Data final"
                type="date"
                min="1900-01-01"
                max={localDate()}
                required
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              />
              <Button type="submit">Aplicar período</Button>
            </>
          )}
        </form>
        {error && <Notice error>{error}</Notice>}
      </Card>
      <div className="rw-section-heading">
        <div>
          <h2>{settings.hospital}</h2>
          <p className="muted">
            Chegadas de {readable(range.from)} a {readable(range.to)} ·{' '}
            {settings.unit}
          </p>
        </div>
        <span className="count-pill">{selected.length} registros</span>
      </div>
      <Metrics
        items={[
          {
            label: 'Pacientes recebidos',
            value: selected.length,
            foot: 'Chegadas dentro do período',
          },
          {
            label: 'Atendimentos finalizados',
            value: concluded.length,
            foot: 'Entre os pacientes recebidos',
          },
          {
            label: 'Espera média',
            value:
              wait === null ? (
                '—'
              ) : (
                <>
                  {wait}
                  <span>min</span>
                </>
              ),
            foot: 'Da chegada ao início registrado',
          },
          {
            label: 'Duração média',
            value:
              care === null ? (
                '—'
              ) : (
                <>
                  {care}
                  <span>min</span>
                </>
              ),
            foot: 'Do início à conclusão registrada',
          },
        ]}
      />
      <div className="dashboard-main-grid">
        <Card
          title="Movimentação da unidade"
          subtitle="Entradas e conclusões ocorridas no período selecionado."
        >
          <FlowChart series={volumeSeries(patients, range.from, range.to)} />
        </Card>
        <Card
          title="Perfil das classificações"
          subtitle="Classificações dos pacientes recebidos no período."
        >
          <RiskChart patients={selected} />
          <div className="risk-card-footer">
            {selected.filter((p) => !p.risk).length} pacientes ainda não
            classificados
          </div>
        </Card>
      </div>
      <Card
        title="Registros do período"
        subtitle="Pacientes agrupados pela data de chegada."
      >
        <div className="rw-screen-only">
          <PatientTable
            mode="report"
            patients={selected.slice((current - 1) * 8, current * 8)}
          />
          <Pagination
            page={current}
            total={selected.length}
            onChange={setPage}
          />
        </div>
        <div className="rw-print-only">
          <PatientTable mode="report" patients={selected} />
        </div>
      </Card>
      <p className="rw-report-note">
        As médias consideram apenas registros com os horários necessários.
        Conclusões no gráfico seguem a data de finalização; os indicadores
        seguem os pacientes recebidos no período.
      </p>
    </>
  );
}
