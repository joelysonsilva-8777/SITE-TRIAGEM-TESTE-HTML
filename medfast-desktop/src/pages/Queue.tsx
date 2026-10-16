import { useEffect, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { store, useStore } from '../data/store';
import { fold, queue, waitMinutes } from '../lib/format';
import { useFeedback } from '../components/Feedback';
import {
  Button,
  Card,
  PageHeading,
  SearchField,
  Select,
} from '../components/UI';
import { PatientTable } from '../components/PatientTable';

export default function Queue() {
  const { patients } = useStore();
  const { open } = useFeedback();
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('all');
  const [order, setOrder] = useState('priority');
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const waiting = queue(patients);
  const filtered = waiting.filter(
    (p) =>
      (risk === 'all' || p.risk === risk) &&
      fold(`${p.name} ${p.code}`).includes(fold(search)),
  );
  if (order === 'arrival')
    filtered.sort((a, b) => Date.parse(a.arrivalAt) - Date.parse(b.arrivalAt));
  if (order === 'name')
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const average = waiting.length
    ? Math.round(
        waiting.reduce((sum, p) => sum + waitMinutes(p), 0) / waiting.length,
      )
    : 0;
  return (
    <>
      <PageHeading
        title="A espera também merece atenção."
        eyebrow="FILA DE ATENDIMENTO"
        description="Acompanhe a prioridade registrada e encaminhe cada pessoa para o próximo cuidado."
      >
        <Button onClick={() => open({ kind: 'new' })}>
          <Plus size={17} />
          Receber paciente
        </Button>
      </PageHeading>
      <div className="rw-risk-summary">
        <button
          className={`rw-risk-card ${risk === 'all' ? 'selected' : ''}`}
          aria-pressed={risk === 'all'}
          onClick={() => setRisk('all')}
        >
          <strong>{waiting.length}</strong>
          <span>Todos na fila</span>
          <small>{average} min de espera média</small>
        </button>
        {store.risks.map((r) => (
          <button
            key={r.id}
            className={`rw-risk-card ${risk === r.id ? 'selected' : ''}`}
            style={{ borderTopColor: r.color }}
            aria-pressed={risk === r.id}
            onClick={() => setRisk(r.id)}
          >
            <strong>{waiting.filter((p) => p.risk === r.id).length}</strong>
            <span>{r.label}</span>
            <small>Prioridade {r.rank}</small>
          </button>
        ))}
      </div>
      <Card
        title="Pessoas aguardando"
        subtitle="Classificação registrada, seguida da ordem de chegada."
      >
        <div className="rw-toolbar">
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Ordenar por"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="priority">Prioridade e chegada</option>
            <option value="arrival">Ordem de chegada</option>
            <option value="name">Nome do paciente</option>
          </Select>
        </div>
        <PatientTable mode="queue" patients={filtered} />
        <div className="queue-footer">
          <Clock size={14} />
          Espera contada desde a chegada. A classificação é definida pelo
          profissional.
        </div>
      </Card>
    </>
  );
}
