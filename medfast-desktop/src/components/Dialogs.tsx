import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, ClipboardPenLine, Pencil, Printer, X } from 'lucide-react';
import { store, useStore } from '../data/store';
import type { Patient, Staff } from '../data/types';
import { age, availability, dateTime, fold, vitalFields } from '../lib/format';
import { rooms, outcomes } from '../lib/workflow';
import { useFeedback } from './Feedback';
import {
  Availability,
  Avatar,
  Button,
  Empty,
  IconButton,
  Input,
  Notice,
  PatientCell,
  RiskBadge,
  SearchField,
  Select,
  StaffAvatar,
  StatusBadge,
  Textarea,
} from './UI';
import { PatientForm } from './PatientForm';
import { identityOf } from '../lib/identity';

function Modal({
  title,
  children,
  record,
}: {
  title: string;
  children: ReactNode;
  record?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { close } = useFeedback();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog
      .querySelector<HTMLInputElement>('input:not([type="checkbox"]), textarea')
      ?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`modal ${record ? 'rw-record-dialog' : ''}`}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const bounds = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            close();
        }
      }}
    >
      <header className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <IconButton label="Fechar janela" onClick={close}>
          <X size={20} />
        </IconButton>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>,
    document.body,
  );
}
function MutationForm({
  children,
  label = 'Salvar alterações',
  action,
  danger = false,
}: {
  children: ReactNode;
  label?: string;
  action: () => string | Promise<string>;
  danger?: boolean;
}) {
  const { close, notify } = useFeedback();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const message = await action();
      close();
      notify(message);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit}>
      {error && <Notice error>{error}</Notice>}
      {children}
      <div className="form-actions">
        <Button variant="secondary" onClick={close}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={busy}
          variant={danger ? 'danger' : 'primary'}
        >
          {busy ? 'Salvando no computador...' : label}
        </Button>
      </div>
    </form>
  );
}
function PatientEditor({ patient }: { patient?: Patient }) {
  const [identity, setIdentity] = useState(() => identityOf(patient));
  return (
    <MutationForm
      label={patient ? 'Salvar cadastro' : 'Cadastrar paciente'}
      action={async () => {
        if (
          identity.name.trim().length < 3 ||
          identity.complaint.trim().length < 3
        )
          throw new Error(
            'Preencha o nome e a queixa principal com pelo menos 3 caracteres.',
          );
        if (patient) {
          if (!(await store.updatePatient(patient.id, identity)))
            throw new Error('Paciente não encontrado.');
        } else await store.addPatient(identity);
        return patient
          ? 'Cadastro atualizado.'
          : 'Paciente recebido e encaminhado à triagem.';
      }}
    >
      <p className="form-intro">
        {patient
          ? 'Mantenha os dados de identificação atualizados.'
          : 'O acolhimento começa aqui. Após o cadastro, o paciente aparecerá na fila de triagem.'}
      </p>
      <PatientForm value={identity} onChange={setIdentity} />
    </MutationForm>
  );
}
function PatientDetail({ patient: p }: { patient: Patient }) {
  const { staff } = useStore();
  const { open, close } = useFeedback();
  const navigate = useNavigate();
  return (
    <>
      <div className="detail-profile">
        <Avatar name={p.name} />
        <div>
          <h3>{p.name}</h3>
          <p>
            {p.code} · {age(p.birthDate)} · {p.sex || 'Sexo não informado'}
          </p>
        </div>
      </div>
      <div className="detail-badges">
        <RiskBadge risk={p.risk} />
        <StatusBadge status={p.status} />
      </div>
      <dl className="rw-review">
        <div>
          <dt>Queixa principal</dt>
          <dd>{p.complaint || 'Não informada'}</dd>
        </div>
        <div>
          <dt>Alergias</dt>
          <dd>{p.allergies || 'Não informadas'}</dd>
        </div>
        <div>
          <dt>Contato</dt>
          <dd>{p.phone || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Responsável e sala</dt>
          <dd>
            {staff.find((s) => s.id === p.professional)?.name || 'Não definido'}{' '}
            · {p.room || 'Sala não definida'}
          </dd>
        </div>
        <div>
          <dt>Chegada</dt>
          <dd>{dateTime(p.arrivalAt)}</dd>
        </div>
        <div>
          <dt>Início do atendimento</dt>
          <dd>{dateTime(p.startedAt)}</dd>
        </div>
        {p.finishedAt && (
          <>
            <div>
              <dt>Finalização</dt>
              <dd>{dateTime(p.finishedAt)}</dd>
            </div>
            <div>
              <dt>Desfecho</dt>
              <dd>{p.outcome || 'Não informado'}</dd>
            </div>
          </>
        )}
      </dl>
      <h3 className="detail-subtitle">Sinais vitais registrados</h3>
      <div className="vital-grid">
        {vitalFields.map((f) => (
          <div key={f.key}>
            <span>{f.label}</span>
            <strong>{p.vitals[f.key] ?? '—'}</strong>
            <small>{f.unit}</small>
          </div>
        ))}
      </div>
      {p.notes && (
        <>
          <h3 className="detail-subtitle">Observações e evolução</h3>
          <p className="pre-wrap">{p.notes}</p>
        </>
      )}
      <h3 className="detail-subtitle">Histórico do cuidado</h3>
      <ol className="rw-timeline">
        {[...p.history].reverse().map((h, i) => (
          <li key={`${h.at}-${i}`}>
            <time>{dateTime(h.at)}</time>
            <p>{h.text}</p>
          </li>
        ))}
      </ol>
      <div className="form-actions rw-wrap">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir ficha
        </Button>
        <Button
          variant="secondary"
          onClick={() => open({ kind: 'edit', id: p.id })}
        >
          <Pencil size={16} />
          Editar cadastro
        </Button>
        {p.status === 'triage' && (
          <Button
            onClick={() => {
              close();
              navigate(`/triagem?paciente=${p.id}`);
            }}
          >
            Iniciar triagem <ArrowRight size={16} />
          </Button>
        )}
        {p.status === 'waiting' && (
          <Button onClick={() => open({ kind: 'call', id: p.id })}>
            Chamar paciente
          </Button>
        )}
        {p.status === 'attending' && (
          <>
            <Button
              variant="secondary"
              onClick={() => open({ kind: 'assign', id: p.id })}
            >
              Definir responsável
            </Button>
            <Button onClick={() => open({ kind: 'evolution', id: p.id })}>
              <ClipboardPenLine size={16} />
              Registrar evolução
            </Button>
            <Button onClick={() => open({ kind: 'finish', id: p.id })}>
              Finalizar atendimento
            </Button>
          </>
        )}
      </div>
    </>
  );
}
function Assignment({ patient, call }: { patient: Patient; call: boolean }) {
  const { staff } = useStore();
  const people = call
    ? staff.filter(
        (s) => /médic|clínic|pediatr/i.test(s.role) && s.status !== 'break',
      )
    : staff;
  const [professional, setProfessional] = useState(
    people.some((s) => s.id === patient.professional)
      ? patient.professional
      : '',
  );
  const [room, setRoom] = useState(patient.room || '');
  return (
    <MutationForm
      label={call ? 'Chamar e iniciar atendimento' : 'Salvar responsável'}
      action={async () => {
        const current = store.patient(patient.id);
        if (!current || current.status !== (call ? 'waiting' : 'attending'))
          throw new Error(
            'A situação deste paciente mudou. Consulte a ficha atualizada.',
          );
        if (!professional || !room)
          throw new Error('Selecione o profissional e a sala.');
        await store.updatePatient(patient.id, {
          professional,
          room,
          ...(call ? { status: 'attending' as const } : {}),
        });
        return call
          ? 'Paciente chamado. Atendimento iniciado.'
          : 'Responsável e sala atualizados.';
      }}
    >
      <div className="detail-profile">
        <Avatar name={patient.name} />
        <div>
          <h3>{patient.name}</h3>
          <p>
            {patient.code} · {age(patient.birthDate)}
          </p>
        </div>
      </div>
      <Notice>
        {call
          ? 'Ao confirmar, o paciente sai da fila e passa para os atendimentos em andamento.'
          : 'Registre quem dará continuidade ao cuidado e o local do atendimento.'}
      </Notice>
      <div className="form-grid">
        <Select
          label="Profissional responsável"
          full
          required
          value={professional}
          onChange={(e) => setProfessional(e.target.value)}
        >
          <option value="">Selecione</option>
          {people.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {availability[s.status]}
            </option>
          ))}
        </Select>
        <Select
          label="Sala de atendimento"
          full
          required
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        >
          <option value="">Selecione</option>
          {[
            ...new Set([...rooms, ...(patient.room ? [patient.room] : [])]),
          ].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </div>
    </MutationForm>
  );
}
function Evolution({ patient }: { patient: Patient }) {
  const { staff } = useStore();
  const [text, setText] = useState('');
  const [professional, setProfessional] = useState(patient.professional || '');
  return (
    <MutationForm
      label="Salvar evolução"
      action={async () => {
        const current = store.patient(patient.id);
        if (!current || current.status !== 'attending')
          throw new Error('Este atendimento não está mais em andamento.');
        const person = store.staff().find((s) => s.id === professional);
        if (!person || text.trim().length < 10)
          throw new Error(
            'Selecione o profissional e escreva pelo menos 10 caracteres.',
          );
        const entry = `${dateTime(new Date().toISOString())} · ${person.name}: ${text.trim()}`;
        if ((current.notes + entry).length > 5998)
          throw new Error(
            'O limite de observações deste atendimento foi atingido.',
          );
        await store.updateWithEvent(
          patient.id,
          {
            notes: [current.notes, entry].filter(Boolean).join('\n\n'),
          },
          entry,
        );
        return 'Evolução registrada no histórico do paciente.';
      }}
    >
      <p className="form-intro">
        {patient.name} · {patient.code}
      </p>
      <div className="form-grid">
        <Select
          full
          label="Profissional do registro"
          required
          value={professional}
          onChange={(e) => setProfessional(e.target.value)}
        >
          <option value="">Selecione</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Textarea
          label="Evolução do atendimento"
          required
          minLength={10}
          maxLength={2000}
          placeholder="Descreva a avaliação, os cuidados e as orientações..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </MutationForm>
  );
}
function Finish({ patient }: { patient: Patient }) {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  return (
    <MutationForm
      label="Confirmar finalização"
      action={async () => {
        const current = store.patient(patient.id);
        if (!current || current.status !== 'attending')
          throw new Error('Este atendimento não está mais em andamento.');
        if (
          !confirmed ||
          !outcomes.includes(outcome) ||
          notes.trim().length < 10
        )
          throw new Error(
            'Informe o desfecho, registre pelo menos 10 caracteres e confirme a conclusão.',
          );
        const entry = `Finalização — ${outcome}: ${notes.trim()}`;
        if ((current.notes + entry).length > 5998)
          throw new Error(
            'O limite de observações deste atendimento foi atingido.',
          );
        await store.updateWithEvent(
          patient.id,
          {
            status: 'finished',
            outcome,
            notes: [current.notes, entry].filter(Boolean).join('\n\n'),
          },
          entry,
        );
        return 'Atendimento finalizado. O histórico permanece disponível.';
      }}
    >
      <Notice>
        Você está concluindo o atendimento de <strong>{patient.name}</strong>.
        Registre o desfecho e as orientações finais.
      </Notice>
      <div className="form-grid">
        <Select
          full
          label="Desfecho do atendimento"
          required
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
        >
          <option value="">Selecione</option>
          {outcomes.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <Textarea
          label="Observações finais"
          required
          minLength={10}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <label className="rw-checkbox">
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>Confirmo a conclusão e o registro das orientações.</span>
      </label>
    </MutationForm>
  );
}
function Settings() {
  const { settings } = useStore();
  const { close } = useFeedback();
  const [draft, setDraft] = useState(settings);
  return (
    <>
      <MutationForm
        action={async () => {
          await store.updateSettings(draft);
          return 'Preferências atualizadas.';
        }}
      >
        <p className="form-intro">
          Personalize as informações exibidas neste computador.
        </p>
        <div className="form-grid">
          <Input
            label="Seu nome"
            full
            required
            maxLength={150}
            value={draft.userName}
            onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
          />
          <Input
            label="Hospital"
            required
            maxLength={150}
            value={draft.hospital}
            onChange={(e) => setDraft({ ...draft, hospital: e.target.value })}
          />
          <Input
            label="Unidade"
            required
            maxLength={150}
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
          />
        </div>
      </MutationForm>
      <div className="rw-settings-reset">
        <h3>Armazenamento e sincronização</h3>
        <p>Consulte os envios pendentes e crie backups protegidos por senha.</p>
        <Link className="btn btn-secondary" to="/sincronizacao" onClick={close}>
          Abrir central de sincronização
        </Link>
      </div>
    </>
  );
}
function GlobalSearch() {
  const { patients } = useStore();
  const { open } = useFeedback();
  const [query, setQuery] = useState('');
  const results = patients
    .filter((p) =>
      fold(`${p.name} ${p.code} ${p.complaint}`).includes(fold(query)),
    )
    .slice(0, 30);
  return (
    <>
      <SearchField
        label="Busca global"
        placeholder="Nome, código ou queixa..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="rw-search-caption">
        {query
          ? 'Até 30 registros encontrados'
          : 'Pacientes recentes · digite para buscar'}
      </p>
      <div className="rw-search-results">
        {results.map((p) => (
          <button
            className="rw-search-result"
            key={p.id}
            onClick={() => open({ kind: 'detail', id: p.id })}
          >
            <Avatar name={p.name} />
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.code} · {store.statuses[p.status]}
              </small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      {!results.length && <Empty />}
    </>
  );
}
function NewStaff() {
  const [value, setValue] = useState({
    name: '',
    role: 'Enfermeira',
    department: 'Triagem',
    shift: '07h – 19h',
  });
  return (
    <MutationForm
      label="Cadastrar profissional"
      action={async () => {
        await store.addStaff(value);
        return 'Profissional cadastrado e salvo no computador.';
      }}
    >
      <div className="form-grid">
        <Input
          full
          label="Nome do profissional"
          required
          minLength={2}
          maxLength={150}
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
        />
        <Select
          label="Função"
          value={value.role}
          onChange={(e) => setValue({ ...value, role: e.target.value })}
        >
          {[
            'Enfermeira',
            'Enfermeiro',
            'Médica',
            'Médico',
            'Técnico de enfermagem',
            'Recepção',
          ].map((role) => (
            <option key={role}>{role}</option>
          ))}
        </Select>
        <Input
          label="Setor"
          required
          minLength={2}
          maxLength={150}
          value={value.department}
          onChange={(e) => setValue({ ...value, department: e.target.value })}
        />
        <Input
          full
          label="Horário do plantão"
          required
          minLength={2}
          maxLength={150}
          value={value.shift}
          onChange={(e) => setValue({ ...value, shift: e.target.value })}
        />
      </div>
    </MutationForm>
  );
}
function StaffDetail({ person }: { person: Staff }) {
  const { patients } = useStore();
  const { open, notify } = useFeedback();
  const assigned = patients.filter(
    (p) => p.professional === person.id && p.status !== 'finished',
  );
  return (
    <>
      <div className="detail-profile">
        <StaffAvatar person={person} />
        <div>
          <h3>{person.name}</h3>
          <p>
            {person.role} · {person.department}
          </p>
        </div>
      </div>
      <Availability status={person.status} />
      <p className="rw-shift">Plantão: {person.shift}</p>
      <Select
        label="Disponibilidade"
        value={person.status}
        onChange={async (e) => {
          try {
            await store.updateStaff(person.id, {
              status: e.target.value as Staff['status'],
            });
            notify('Disponibilidade atualizada.');
          } catch (error) {
            notify(
              error instanceof Error
                ? error.message
                : 'Não foi possível salvar.',
            );
          }
        }}
      >
        {Object.entries(availability).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </Select>
      <h3 className="detail-subtitle">Pacientes sob responsabilidade</h3>
      {assigned.map((p) => (
        <div className="rw-assigned-row" key={p.id}>
          <PatientCell
            patient={p}
            onOpen={() => open({ kind: 'detail', id: p.id })}
          />
          <StatusBadge status={p.status} />
        </div>
      ))}
      {!assigned.length && (
        <p className="muted">
          Nenhum paciente em cuidado vinculado no momento.
        </p>
      )}
    </>
  );
}
export default function Dialogs() {
  const { dialog, open, close } = useFeedback();
  const { patients, staff, events } = useStore();
  if (!dialog) return null;
  const patient =
    'id' in dialog ? patients.find((p) => p.id === dialog.id) : undefined;
  const person =
    dialog.kind === 'staff' ? staff.find((s) => s.id === dialog.id) : undefined;
  const names = {
    new: 'Receber paciente',
    edit: 'Editar cadastro',
    detail: 'Ficha do paciente',
    call: 'Chamar paciente',
    assign: 'Responsável e sala',
    evolution: 'Registrar evolução',
    finish: 'Finalizar atendimento',
    profile: 'Perfil e preferências',
    unit: 'Configurações da unidade',
    help: 'Como podemos ajudar?',
    events: 'Atividades recentes',
    search: 'Buscar no MedFast',
    shifts: 'Escala do plantão',
    reset: 'Recuperar dados',
    staff: 'Profissional do plantão',
    'staff-new': 'Cadastrar profissional',
  };
  let content: ReactNode;
  switch (dialog.kind) {
    case 'staff-new':
      content = <NewStaff />;
      break;
    case 'new':
      content = <PatientEditor />;
      break;
    case 'edit':
      content = patient && <PatientEditor patient={patient} />;
      break;
    case 'detail':
      content = patient && <PatientDetail patient={patient} />;
      break;
    case 'call':
    case 'assign':
      content = patient && (
        <Assignment patient={patient} call={dialog.kind === 'call'} />
      );
      break;
    case 'evolution':
      content = patient && <Evolution patient={patient} />;
      break;
    case 'finish':
      content = patient && <Finish patient={patient} />;
      break;
    case 'profile':
    case 'unit':
      content = <Settings />;
      break;
    case 'reset':
      content = (
        <Notice>
          A restauração de backups está na central de sincronização.
        </Notice>
      );
      break;
    case 'search':
      content = <GlobalSearch />;
      break;
    case 'staff':
      content = person && <StaffDetail person={person} />;
      break;
    case 'shifts':
      content = (
        <>
          <p className="form-intro">
            Equipe cadastrada no plantão. As disponibilidades são atualizadas
            manualmente.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Setor</th>
                  <th>Horário</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => open({ kind: 'staff', id: s.id })}
                      >
                        {s.name}
                      </button>
                      <small className="patient-meta">{s.role}</small>
                    </td>
                    <td>{s.department}</td>
                    <td>{s.shift}</td>
                    <td>
                      <Availability status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
      break;
    case 'events':
      content = (
        <>
          <p className="form-intro">Últimos 100 registros da unidade.</p>
          <ol className="rw-timeline">
            {events.slice(0, 100).map((event) => (
              <li key={event.id}>
                <time>{dateTime(event.at)}</time>
                <p>{event.text}</p>
                <button
                  className="text-button"
                  onClick={() => open({ kind: 'detail', id: event.patientId })}
                >
                  {patients.find((p) => p.id === event.patientId)?.name ||
                    'Consultar paciente'}
                </button>
              </li>
            ))}
          </ol>
          {!events.length && (
            <Empty
              title="Nenhuma atividade recente"
              description="Os registros aparecerão aqui."
            />
          )}
        </>
      );
      break;
    case 'help':
      content = (
        <div className="rw-help">
          <p>
            O MedFast organiza o percurso do paciente, da recepção à conclusão do
            atendimento.
          </p>
          <ol>
            <li>
              <strong>Receber:</strong> cadastre a identificação e a queixa
              principal.
            </li>
            <li>
              <strong>Triar:</strong> registre a avaliação, os sinais vitais e a
              classificação definida pelo profissional.
            </li>
            <li>
              <strong>Atender:</strong> chame pela fila, defina responsável e
              sala, registre a evolução e o desfecho.
            </li>
            <li>
              <strong>Acompanhar:</strong> consulte a equipe e exporte os
              relatórios da unidade.
            </li>
          </ol>
          <Notice>
            Os registros ficam no banco local deste computador. A central de
            sincronização mostra os envios ao Firebase, conflitos e backups. O
            primeiro login exige internet e autorização da unidade.
          </Notice>
          <p>
            Use Ctrl + K (ou ⌘ K) para buscar pacientes. A navegação e os
            formulários também funcionam pelo teclado.
          </p>
          <Link className="btn btn-primary" to="/pacientes" onClick={close}>
            Consultar pacientes <ArrowRight size={16} />
          </Link>
        </div>
      );
      break;
  }
  return (
    <Modal
      key={`${dialog.kind}-${'id' in dialog ? dialog.id : ''}`}
      title={names[dialog.kind]}
      record={dialog.kind === 'detail'}
    >
      {content || (
        <Empty
          title="Registro não encontrado"
          description="O registro pode ter sido alterado em outro computador."
        />
      )}
    </Modal>
  );
}
