import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { store, useStore } from '../data/store';
import type { Staff } from '../data/types';
import { availability, fold } from '../lib/format';
import { useFeedback } from '../components/Feedback';
import {
  Availability,
  Button,
  Empty,
  Metrics,
  PageHeading,
  SearchField,
  Select,
  StaffAvatar,
} from '../components/UI';

export default function Team() {
  const { staff } = useStore();
  const { open, notify } = useFeedback();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const filtered = staff.filter(
    (s) =>
      (department === 'all' || s.department === department) &&
      (status === 'all' || s.status === status) &&
      fold(`${s.name} ${s.role} ${s.department}`).includes(fold(search)),
  );
  return (
    <>
      <PageHeading
        title="Ninguém cuida sozinho."
        eyebrow="NOSSA EQUIPE"
        description="Encontre os profissionais do plantão, consulte a disponibilidade e mantenha a equipe por perto."
      >
        <Button variant="secondary" onClick={() => open({ kind: 'shifts' })}>
          <CalendarDays size={17} />
          Escala do plantão
        </Button>
      </PageHeading>
      <Metrics
        items={[
          {
            label: 'No plantão',
            value: staff.length,
            foot: 'Profissionais da unidade',
          },
          ...Object.entries(availability).map(([value, label]) => ({
            label,
            value: staff.filter((s) => s.status === value).length,
            foot:
              value === 'available'
                ? 'Prontos para acolher'
                : value === 'busy'
                  ? 'Cuidado em andamento'
                  : 'Intervalo registrado',
          })),
        ]}
      />
      <div className="rw-section-heading">
        <div>
          <h2>Gente que cuida</h2>
          <p className="muted">Uma equipe presente em cada etapa.</p>
        </div>
        <span className="count-pill">{filtered.length} profissionais</span>
      </div>
      <div className="rw-toolbar rw-toolbar-plain">
        <SearchField
          label="Buscar profissionais"
          placeholder="Nome, especialidade ou setor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Setor"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="all">Todos os setores</option>
          {[...new Set(staff.map((s) => s.department))].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
        <Select
          label="Disponibilidade"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Todas as situações</option>
          {Object.entries(availability).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {!filtered.length ? (
        <Empty />
      ) : (
        <div className="rw-team-grid">
          {filtered.map((s) => (
            <article className="rw-team-card" key={s.id}>
              <div className="rw-team-photo">
                <StaffAvatar person={s} />
                <span>{s.department}</span>
              </div>
              <div className="rw-team-info">
                <Availability status={s.status} />
                <h3>
                  <button onClick={() => open({ kind: 'staff', id: s.id })}>
                    {s.name}
                    <ArrowUpRight size={18} />
                  </button>
                </h3>
                <p>{s.role}</p>
                <p className="rw-shift">
                  <CalendarDays size={15} />
                  {s.shift}
                </p>
                <Select
                  label={`Disponibilidade de ${s.name}`}
                  value={s.status}
                  onChange={(e) => {
                    store.updateStaff(s.id, {
                      status: e.target.value as Staff['status'],
                    });
                    notify(`Disponibilidade de ${s.name} atualizada.`);
                  }}
                >
                  {Object.entries(availability).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="rw-team-note">
        <img
          src="/assets/images/care-team.jpg"
          alt="Profissionais de saúde colaborando no cuidado."
          loading="lazy"
        />
        <div>
          <div className="eyebrow">PRESENÇA QUE FAZ DIFERENÇA</div>
          <h2>O cuidado começa entre nós.</h2>
          <p>
            Comunicação clara, respeito ao tempo de cada pessoa e registros
            atualizados ajudam a próxima equipe a continuar o cuidado.
          </p>
          <small>Fotografias ilustrativas · Equipe e dados fictícios</small>
        </div>
      </div>
    </>
  );
}
