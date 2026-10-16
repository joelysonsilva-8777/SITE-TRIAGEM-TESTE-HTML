import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { store, useStore } from '../data/store';
import type { Patient, RiskId, Vitals } from '../data/types';
import { age, fold, dateTime, vitalFields } from '../lib/format';
import { readDraft, saveDraft, type TriageDraft } from '../lib/triage';
import { useFeedback } from '../components/Feedback';
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Notice,
  PageHeading,
  RiskBadge,
  SearchField,
  Select,
  Textarea,
} from '../components/UI';
import { PatientForm } from '../components/PatientForm';
import { rooms } from '../lib/workflow';

function TriageAssessment({ patient }: { patient: Patient }) {
  const { staff } = useStore();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => readDraft(patient));
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(true);
  const patch = (values: Partial<TriageDraft>) => {
    const next = { ...draft, ...values };
    setDraft(next);
    void saveDraft(next, patient.id).then(setSaved);
    setError('');
    setConfirmed(false);
  };
  const nurses = staff.filter((s) => /enfermeir[oa]/i.test(s.role));
  const doctors = staff.filter(
    (s) => /médic|clínic|pediatr/i.test(s.role) && s.status !== 'break',
  );
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (draft.step === 0) {
      patch({ step: 1 });
      return;
    }
    if (
      !draft.risk ||
      !nurses.some((s) => s.id === draft.nurse) ||
      draft.rationale.trim().length < 10
    ) {
      setError(
        'Selecione a classificação, o enfermeiro responsável e descreva a avaliação com pelo menos 10 caracteres.',
      );
      return;
    }
    for (const field of vitalFields) {
      const value = draft.vitals[field.key].trim();
      if (
        value &&
        (!Number.isFinite(Number(value.replace(',', '.'))) ||
          Number(value.replace(',', '.')) < field.min ||
          Number(value.replace(',', '.')) > field.max)
      ) {
        setError(
          `${field.label}: informe um valor entre ${field.min} e ${field.max}, ou deixe em branco.`,
        );
        return;
      }
    }
    if (draft.destination === 'attending' && (!draft.doctor || !draft.room)) {
      setError(
        'Defina o profissional médico e a sala para o encaminhamento imediato.',
      );
      return;
    }
    if (draft.step === 1) {
      patch({ step: 2 });
      return;
    }
    if (!confirmed) {
      setError('Confirme a revisão dos dados para concluir a triagem.');
      return;
    }
    setBusy(true);
    try {
      const current = store.patient(patient.id);
      if (!current || current.status !== 'triage')
        throw new Error(
          'Este paciente já foi encaminhado. Atualize a seleção.',
        );
      const vitals = Object.fromEntries(
        vitalFields.map((f) => [
          f.key,
          draft.vitals[f.key].trim()
            ? Number(draft.vitals[f.key].replace(',', '.'))
            : null,
        ]),
      ) as Vitals;
      const nurse = staff.find((s) => s.id === draft.nurse)!;
      const note = `Triagem por ${nurse.name}: ${draft.rationale.trim()}`;
      const identity = {
        name: draft.name,
        birthDate: draft.birthDate,
        sex: draft.sex,
        phone: draft.phone,
        complaint: draft.complaint,
        allergies: draft.allergies,
      };
      await store.updateWithEvent(
        patient.id,
        {
          ...identity,
          risk: draft.risk as RiskId,
          vitals,
          status: draft.destination,
          professional:
            draft.destination === 'attending' ? draft.doctor : draft.nurse,
          room: draft.destination === 'attending' ? draft.room : '',
          notes: [current.notes, note].filter(Boolean).join('\n\n'),
        },
        note,
      );
      await saveDraft(null, patient.id);
      notify(
        draft.destination === 'attending'
          ? 'Triagem concluída. Atendimento imediato iniciado.'
          : 'Triagem concluída. Paciente encaminhado à fila.',
      );
      navigate(draft.destination === 'attending' ? '/atendimentos' : '/fila');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível concluir a triagem.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <div className="rw-triage-person">
        <Avatar name={patient.name} />
        <div>
          <h2>{patient.name}</h2>
          <p>
            {patient.code} · {age(patient.birthDate)} · Chegada{' '}
            {dateTime(patient.arrivalAt)}
          </p>
        </div>
        <ShieldCheck size={25} />
      </div>
      <ol className="rw-steps">
        {['Identificação', 'Avaliação', 'Revisão'].map((label, i) => (
          <li
            key={label}
            aria-current={draft.step === i ? 'step' : undefined}
            className={draft.step >= i ? 'active' : ''}
          >
            <span>{draft.step > i ? <Check size={16} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <form className="card-body rw-triage-form" onSubmit={submit}>
        {!saved && (
          <Notice error>
            O rascunho está apenas em memória. Não foi possível salvá-lo no
            computador.
          </Notice>
        )}
        {error && <Notice error>{error}</Notice>}
        {draft.step === 0 && (
          <>
            <div className="rw-form-heading">
              <h2>Comece pela escuta.</h2>
              <p>Confirme a identificação e registre o motivo da chegada.</p>
            </div>
            <PatientForm value={draft} onChange={patch} />
          </>
        )}
        {draft.step === 1 && (
          <>
            <div className="rw-form-heading">
              <h2>Avaliação e classificação</h2>
              <p>
                Registre o que foi aferido. Campos em branco ficam como não
                informados.
              </p>
            </div>
            <div className="form-grid rw-vitals-form">
              {vitalFields.map((f) => (
                <Input
                  key={f.key}
                  label={f.label}
                  hint={f.unit}
                  inputMode="decimal"
                  placeholder="Não aferido"
                  value={draft.vitals[f.key]}
                  onChange={(e) =>
                    patch({
                      vitals: { ...draft.vitals, [f.key]: e.target.value },
                    })
                  }
                />
              ))}
            </div>
            <fieldset className="rw-risk-choice">
              <legend>Classificação de risco</legend>
              <p className="muted">
                Escolha a classificação conforme a avaliação profissional.
              </p>
              {store.risks.map((r) => (
                <label
                  key={r.id}
                  className={draft.risk === r.id ? 'selected' : ''}
                  style={{ borderLeftColor: r.color }}
                >
                  <input
                    type="radio"
                    name="risk"
                    value={r.id}
                    required
                    checked={draft.risk === r.id}
                    onChange={() =>
                      patch({ risk: r.id, destination: 'waiting' })
                    }
                  />
                  <strong>{r.label}</strong>
                  <span>Prioridade {r.rank}</span>
                </label>
              ))}
            </fieldset>
            <div className="form-grid">
              <Select
                full
                label="Enfermeiro responsável"
                required
                value={draft.nurse}
                onChange={(e) => patch({ nurse: e.target.value })}
              >
                <option value="">Selecione o profissional</option>
                {nurses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Avaliação e justificativa da classificação"
                minLength={10}
                maxLength={2000}
                required
                value={draft.rationale}
                onChange={(e) => patch({ rationale: e.target.value })}
              />
              {draft.risk === 'red' && (
                <>
                  <Select
                    full
                    label="Encaminhamento"
                    value={draft.destination}
                    onChange={(e) =>
                      patch({
                        destination: e.target.value as 'waiting' | 'attending',
                      })
                    }
                  >
                    <option value="waiting">
                      Fila prioritária de atendimento
                    </option>
                    <option value="attending">
                      Iniciar atendimento imediatamente
                    </option>
                  </Select>
                  {draft.destination === 'attending' && (
                    <>
                      <Select
                        label="Profissional médico"
                        required
                        value={draft.doctor}
                        onChange={(e) => patch({ doctor: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        {doctors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        label="Sala"
                        required
                        value={draft.room}
                        onChange={(e) => patch({ room: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        {rooms.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </Select>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
        {draft.step === 2 && (
          <>
            <div className="rw-form-heading">
              <h2>Revise antes de encaminhar.</h2>
              <p>O registro acompanha o paciente na próxima etapa.</p>
            </div>
            <RiskBadge risk={draft.risk || null} />
            <dl className="rw-review">
              <div>
                <dt>Paciente</dt>
                <dd>{draft.name}</dd>
              </div>
              <div>
                <dt>Enfermagem responsável</dt>
                <dd>{staff.find((s) => s.id === draft.nurse)?.name}</dd>
              </div>
              <div>
                <dt>Queixa principal</dt>
                <dd>{draft.complaint}</dd>
              </div>
              <div>
                <dt>Alergias</dt>
                <dd>{draft.allergies || 'Não informadas'}</dd>
              </div>
              <div>
                <dt>Avaliação registrada</dt>
                <dd className="pre-wrap">{draft.rationale}</dd>
              </div>
              <div>
                <dt>Encaminhamento</dt>
                <dd>
                  {draft.destination === 'attending'
                    ? `Atendimento imediato · ${staff.find((s) => s.id === draft.doctor)?.name} · ${draft.room}`
                    : 'Fila de atendimento'}
                </dd>
              </div>
            </dl>
            <div className="vital-grid">
              {vitalFields.map((f) => (
                <div key={f.key}>
                  <span>{f.label}</span>
                  <strong>{draft.vitals[f.key] || '—'}</strong>
                  <small>{f.unit}</small>
                </div>
              ))}
            </div>
            <label className="rw-checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                required
              />
              <span>
                Revisei os dados e confirmo a classificação e o encaminhamento.
              </span>
            </label>
          </>
        )}
        <div className="form-actions">
          {draft.step > 0 && (
            <Button
              variant="secondary"
              onClick={() => patch({ step: draft.step - 1 })}
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {draft.step === 2 ? (
              <>
                <ClipboardCheck size={17} />
                Concluir triagem
              </>
            ) : (
              <>
                Continuar <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>
        <p className="rw-draft-note">
          {saved
            ? 'Rascunho salvo neste computador. Você pode fechar o aplicativo e continuar depois.'
            : 'Não foi possível salvar o rascunho no computador.'}
        </p>
      </form>
    </Card>
  );
}
export default function Triage() {
  const { patients } = useStore();
  const { open } = useFeedback();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const pending = patients
    .filter((p) => p.status === 'triage')
    .sort((a, b) => Date.parse(a.arrivalAt) - Date.parse(b.arrivalAt));
  const selected =
    pending.find((p) => p.id === params.get('paciente')) || pending[0];
  const filtered = pending.filter((p) =>
    fold(`${p.name} ${p.code}`).includes(fold(search)),
  );
  return (
    <>
      <PageHeading
        title="Acolher é o primeiro passo."
        eyebrow="ACOLHIMENTO E TRIAGEM"
        description="Escute, avalie e registre. Cada informação ajuda a dar continuidade ao cuidado."
      >
        <Button variant="secondary" onClick={() => open({ kind: 'new' })}>
          <Plus size={17} />
          Receber paciente
        </Button>
      </PageHeading>
      <div className="rw-triage-layout">
        <aside className="card rw-triage-queue">
          <div className="card-header">
            <div>
              <div className="eyebrow">PRIMEIRA ESCUTA</div>
              <h2 className="card-title">
                Aguardando triagem{' '}
                <span className="count-pill">{pending.length}</span>
              </h2>
            </div>
          </div>
          <div className="rw-queue-search">
            <SearchField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="rw-queue-list">
            {filtered.map((p) => (
              <button
                key={p.id}
                className={`rw-queue-person ${selected?.id === p.id ? 'selected' : ''}`}
                aria-pressed={selected?.id === p.id}
                onClick={() => setParams({ paciente: p.id })}
              >
                <Avatar name={p.name} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.code} · {dateTime(p.arrivalAt)}
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            {!filtered.length && (
              <Empty
                title="Sem pacientes"
                description="Nenhum paciente aguardando nesta busca."
              />
            )}
          </div>
        </aside>
        {selected ? (
          <TriageAssessment key={selected.id} patient={selected} />
        ) : (
          <Card>
            <Empty
              title="Todos acolhidos por aqui."
              description="Novos pacientes recebidos aparecerão na fila de triagem."
            >
              <Button onClick={() => open({ kind: 'new' })}>
                Receber paciente
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </>
  );
}
