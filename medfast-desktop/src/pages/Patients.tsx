import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { downloadCSV, useStore } from '../data/store';
import { fold } from '../lib/format';
import { useFeedback } from '../components/Feedback';
import {
  Button,
  Card,
  PageHeading,
  Pagination,
  RiskFilter,
  SearchField,
  Tabs,
} from '../components/UI';
import { PatientTable } from '../components/PatientTable';

export default function Patients() {
  const { patients } = useStore();
  const { open, notify } = useFeedback();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('active');
  const [risk, setRisk] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = patients.filter(
    (p) =>
      (tab === 'all' ||
        (tab === 'active'
          ? p.status !== 'finished'
          : p.status === 'finished')) &&
      (risk === 'all' || (risk === 'none' ? !p.risk : p.risk === risk)) &&
      fold(`${p.name} ${p.code}`).includes(fold(search)),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  return (
    <>
      <PageHeading
        title="Cada pessoa, um cuidado."
        description="Encontre os pacientes da unidade e acompanhe cada etapa do acolhimento."
        eyebrow="PACIENTES"
      >
        <Button
          variant="secondary"
          onClick={() => {
            downloadCSV(filtered);
            notify('Exportação dos pacientes filtrados iniciada.');
          }}
        >
          <Download size={17} />
          Exportar CSV
        </Button>
        <Button onClick={() => open({ kind: 'new' })}>
          <Plus size={17} />
          Receber paciente
        </Button>
      </PageHeading>
      <Card>
        <div className="rw-toolbar">
          <SearchField
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <RiskFilter
            value={risk}
            onChange={(v) => {
              setRisk(v);
              setPage(1);
            }}
          />
        </div>
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          items={[
            {
              value: 'active',
              label: 'Em cuidado',
              count: patients.filter((p) => p.status !== 'finished').length,
            },
            { value: 'all', label: 'Todos', count: patients.length },
            {
              value: 'finished',
              label: 'Finalizados',
              count: patients.filter((p) => p.status === 'finished').length,
            },
          ]}
        />
        <PatientTable
          patients={filtered.slice((current - 1) * 8, current * 8)}
        />
        <Pagination page={current} total={filtered.length} onChange={setPage} />
      </Card>
    </>
  );
}
