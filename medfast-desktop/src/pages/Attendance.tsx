import { useState } from 'react';
import { ClipboardPenLine, LayoutGrid, List, UserRoundCog } from 'lucide-react';
import { useStore } from '../data/store';
import { dateTime, fold, today } from '../lib/format';
import { useFeedback } from '../components/Feedback';
import {
  Button,
  Card,
  Empty,
  IconButton,
  Metrics,
  PageHeading,
  PatientCell,
  RiskBadge,
  RiskFilter,
  SearchField,
  Select,
  StatusBadge,
  Tabs,
} from '../components/UI';
import { PatientTable } from '../components/PatientTable';

export default function Attendance() {
  const { patients, staff } = useStore();
  const { open } = useFeedback();
  const [tab, setTab] = useState('attending');
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('all');
  const [professional, setProfessional] = useState('all');
  const [view, setView] = useState('cards');
  const groups = [
    {
      value: 'attending',
      label: 'Em atendimento',
      count: patients.filter((p) => p.status === 'attending').length,
    },
    {
      value: 'waiting',
      label: 'Aguardando',
      count: patients.filter((p) => p.status === 'waiting').length,
    },
    {
      value: 'finished',
      label: 'Finalizados hoje',
      count: patients.filter(
        (p) => p.status === 'finished' && p.finishedAt && today(p.finishedAt),
      ).length,
    },
  ];
  const filtered = patients.filter(
    (p) =>
      p.status === tab &&
      (tab !== 'finished' || (!!p.finishedAt && today(p.finishedAt))) &&
      (professional === 'all' || p.professional === professional) &&
      (risk === 'all' || (risk === 'none' ? !p.risk : p.risk === risk)) &&
      fold(`${p.name} ${p.code} ${p.room}`).includes(fold(search)),
  );
  return (
    <>
      <PageHeading
        title="Cuidado que tem continuidade."
        eyebrow="ATENDIMENTOS"
        description="Acompanhe os encontros em andamento, registre a evolução e organize os próximos passos."
      />
      <Metrics
        items={[
          ...groups.map((g) => ({
            label: g.label,
            value: g.count,
            foot:
              g.value === 'finished'
                ? 'Concluídos desde 00h'
                : 'Pacientes da unidade',
          })),
          {
            label: 'Profissionais no plantão',
            value: staff.length,
            foot: 'Equipe multiprofissional',
          },
        ]}
      />
      <Card>
        <Tabs items={groups} value={tab} onChange={setTab} />
        <div className="rw-toolbar rw-toolbar-wrap">
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <RiskFilter value={risk} onChange={setRisk} />
          <Select
            label="Responsável"
            value={professional}
            onChange={(e) => setProfessional(e.target.value)}
          >
            <option value="all">Todos os profissionais</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <div className="rw-actions">
            <IconButton
              label="Exibir cartões"
              aria-pressed={view === 'cards'}
              onClick={() => setView('cards')}
            >
              <LayoutGrid size={20} />
            </IconButton>
            <IconButton
              label="Exibir lista"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List size={20} />
            </IconButton>
          </div>
        </div>
        {view === 'list' ? (
          <PatientTable mode="care" patients={filtered} />
        ) : !filtered.length ? (
          <Empty />
        ) : (
          <div className="rw-care-grid">
            {filtered.map((p) => (
              <article className="rw-care-card" key={p.id}>
                <div className="rw-card-top">
                  <RiskBadge risk={p.risk} />
                  <span>{p.room || 'Sala a definir'}</span>
                </div>
                <PatientCell
                  patient={p}
                  onOpen={() => open({ kind: 'detail', id: p.id })}
                />
                <p className="rw-complaint">
                  {p.complaint || 'Queixa não informada'}
                </p>
                <dl className="rw-meta">
                  <div>
                    <dt>Responsável</dt>
                    <dd>
                      {staff.find((s) => s.id === p.professional)?.name ||
                        'Não definido'}
                    </dd>
                  </div>
                  <div>
                    <dt>{tab === 'finished' ? 'Conclusão' : 'Início'}</dt>
                    <dd>
                      {dateTime(
                        tab === 'finished' ? p.finishedAt : p.startedAt,
                      )}
                    </dd>
                  </div>
                </dl>
                <StatusBadge status={p.status} />
                <div className="rw-care-actions">
                  {tab === 'attending' ? (
                    <>
                      <Button
                        variant="secondary"
                        className="btn-sm"
                        onClick={() => open({ kind: 'evolution', id: p.id })}
                      >
                        <ClipboardPenLine size={16} />
                        Evolução
                      </Button>
                      <IconButton
                        label={`Definir responsável de ${p.name}`}
                        onClick={() => open({ kind: 'assign', id: p.id })}
                      >
                        <UserRoundCog size={18} />
                      </IconButton>
                      <Button
                        className="btn-sm"
                        onClick={() => open({ kind: 'finish', id: p.id })}
                      >
                        Finalizar
                      </Button>
                    </>
                  ) : tab === 'waiting' ? (
                    <Button
                      className="btn-sm"
                      onClick={() => open({ kind: 'call', id: p.id })}
                    >
                      Chamar paciente
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="btn-sm"
                      onClick={() => open({ kind: 'detail', id: p.id })}
                    >
                      Consultar atendimento
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
