import { useState } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Clock,
  FileText,
  Plus,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useStore } from '../data/store';
import { queue, today, waitMinutes, duration } from '../lib/format';
import { dateRange, volumeSeries } from '../lib/analytics';
import { useFeedback } from '../components/Feedback';
import {
  Button,
  Card,
  IconButton,
  Metrics,
  PatientCell,
  RiskBadge,
  StaffAvatar,
  Availability,
} from '../components/UI';
import { FlowChart, RiskChart } from '../components/Charts';
import { useNow } from '../lib/useNow';

export default function Dashboard() {
  const { patients, staff, settings } = useStore();
  const now = useNow();
  const { open } = useFeedback();
  const [period, setPeriod] = useState('today');
  const waiting = queue(patients);
  const active = patients.filter((p) => p.status !== 'finished');
  const pending = patients.filter((p) => p.status === 'triage');
  const available = staff.filter((s) => s.status === 'available').length;
  const average = waiting.length
    ? Math.round(
        waiting.reduce((n, p) => n + waitMinutes(p), 0) / waiting.length,
      )
    : 0;
  const range = dateRange(period);
  const hour = now.getHours();
  return (
    <>
      <section className="home-hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <div className="hero-kicker">
            {hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'},{' '}
            {settings.userName.split(' ')[0]}. Bem-vinda ao plantão.
          </div>
          <h1 id="welcome-title">
            O primeiro
            <br />
            cuidado é <em>ouvir.</em>
          </h1>
          <p>
            Acolha quem chegou, acompanhe a espera e mantenha a equipe por
            perto. Um paciente de cada vez.
          </p>
          <div className="hero-actions">
            <Button variant="amber" onClick={() => open({ kind: 'new' })}>
              <Plus size={17} />
              Receber paciente
            </Button>
            <Link className="hero-secondary" to="/triagem">
              Iniciar triagem <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <figure className="hero-photo">
          <img
            src="/assets/images/care-conversation.jpg"
            width="1600"
            height="1067"
            alt="Profissional de saúde conversando com um paciente durante uma consulta."
            fetchPriority="high"
          />
          <figcaption>
            <strong>Escuta, respeito e atenção.</strong>
            <span>Desde a primeira conversa.</span>
          </figcaption>
        </figure>
      </section>
      <div className="home-tools">
        <Link className="home-tool" to="/triagem">
          <span className="home-tool-icon">
            <ClipboardList size={27} />
          </span>
          <div>
            <strong>Acolhimento e triagem</strong>
            <p>{pending.length} pessoas aguardam a avaliação inicial.</p>
          </div>
          <span className="home-tool-count">Ver pacientes</span>
          <ArrowRight size={19} />
        </Link>
        <Link className="home-tool" to="/equipe">
          <span className="home-tool-icon">
            <Users size={27} />
          </span>
          <div>
            <strong>Conte com a sua equipe</strong>
            <p>
              {staff.length} profissionais no plantão · {available} disponíveis
              agora.
            </p>
          </div>
          <span className="home-tool-count">Consultar equipe</span>
          <ArrowRight size={19} />
        </Link>
      </div>
      <div className="home-section-heading">
        <div>
          <div className="section-label">PRONTO ATENDIMENTO</div>
          <h2>Como está a unidade</h2>
          <p>O movimento de hoje e os pacientes em cuidado.</p>
        </div>
        <span className="live-status">
          <span className="live-dot" />
          Visão do momento
        </span>
      </div>
      <Metrics
        items={[
          {
            label: 'Pacientes recebidos hoje',
            value: patients.filter((p) => today(p.arrivalAt)).length,
            foot: 'Entradas desde 00h',
            icon: <Users size={19} />,
          },
          {
            label: 'Aguardando atendimento',
            value: waiting.length,
            foot: 'Pacientes já classificados',
            icon: <Clock size={19} />,
          },
          {
            label: 'Em atendimento',
            value: active.filter((p) => p.status === 'attending').length,
            foot: 'Com a equipe neste momento',
            icon: <Stethoscope size={19} />,
          },
          {
            label: 'Espera média na fila',
            value: (
              <>
                {average}
                <span>min</span>
              </>
            ),
            foot: 'Tempo desde a chegada',
            icon: <Activity size={19} />,
          },
        ]}
      />
      <div className="dashboard-bottom-grid">
        <Card
          className="queue-card"
          title="Próximos atendimentos"
          subtitle="Prioridade registrada, seguida da ordem de chegada."
          action={
            <Link className="card-link" to="/fila">
              Abrir fila <ArrowRight size={15} />
            </Link>
          }
        >
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Classificação</th>
                  <th>Espera</th>
                  <th>
                    <span className="sr-only">Chamar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {waiting.slice(0, 4).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <PatientCell
                        patient={p}
                        onOpen={() => open({ kind: 'detail', id: p.id })}
                      />
                    </td>
                    <td>
                      <RiskBadge risk={p.risk} />
                    </td>
                    <td className="rw-nowrap">{duration(waitMinutes(p))}</td>
                    <td>
                      <IconButton
                        label={`Chamar ${p.name}`}
                        onClick={() => open({ kind: 'call', id: p.id })}
                      >
                        <ArrowRight size={17} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
                {!waiting.length && (
                  <tr>
                    <td colSpan={4}>Nenhum paciente na fila.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="queue-footer">
            <Clock size={14} /> O tempo de espera é contado a partir da chegada.
          </div>
        </Card>
        <Card
          title="Gente que cuida"
          subtitle="Profissionais do seu plantão"
          action={
            <Link className="card-link" to="/equipe">
              Ver equipe <ArrowRight size={15} />
            </Link>
          }
        >
          <div className="shift-list">
            {staff.slice(0, 4).map((s) => (
              <button
                className="shift-row rw-staff-row"
                key={s.id}
                onClick={() => open({ kind: 'staff', id: s.id })}
              >
                <StaffAvatar person={s} />
                <span>
                  <strong>{s.name}</strong>
                  <small>
                    {s.role} · {s.department}
                  </small>
                </span>
                <span className="staff-state">
                  <span className={`staff-dot ${s.status}`} />
                  <span className="sr-only">
                    <Availability status={s.status} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="team-footer">
            <span>{available} profissionais disponíveis</span>
            <span className="photo-caption">Fotos ilustrativas</span>
          </div>
        </Card>
      </div>
      <div className="dashboard-main-grid">
        <Card
          title="Entradas e atendimentos"
          subtitle="Acompanhe a movimentação da unidade."
          action={
            <div className="segmented">
              <button
                aria-pressed={period === 'today'}
                className={period === 'today' ? 'active' : ''}
                onClick={() => setPeriod('today')}
              >
                Hoje
              </button>
              <button
                aria-pressed={period === '7'}
                className={period === '7' ? 'active' : ''}
                onClick={() => setPeriod('7')}
              >
                7 dias
              </button>
            </div>
          }
        >
          <FlowChart series={volumeSeries(patients, range.from, range.to)} />
        </Card>
        <Card
          title="Classificação de risco"
          subtitle={`${active.filter((p) => p.risk).length} pacientes classificados em cuidado`}
        >
          <RiskChart patients={active} />
          <div className="risk-card-footer">
            <ShieldCheck size={14} />
            Classificação definida pelo profissional.
          </div>
        </Card>
      </div>
      <div className="home-closing">
        <FileText size={23} />
        <p>
          <strong>Na troca de plantão, o registro faz diferença.</strong>{' '}
          Mantenha as observações do atendimento atualizadas para a próxima
          equipe.
        </p>
        <Link to="/atendimentos">Consultar atendimentos</Link>
      </div>
    </>
  );
}
