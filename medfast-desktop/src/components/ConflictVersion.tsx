import { useStore } from '../data/store';
import { availability, dateTime, vitalFields } from '../lib/format';

const labels: Record<string, string> = {
  code: 'Código',
  name: 'Nome',
  birthDate: 'Nascimento',
  sex: 'Sexo informado',
  phone: 'Telefone',
  complaint: 'Queixa principal',
  allergies: 'Alergias',
  risk: 'Classificação',
  status: 'Situação',
  arrivalAt: 'Chegada',
  triagedAt: 'Triagem',
  startedAt: 'Início do atendimento',
  finishedAt: 'Conclusão',
  professional: 'Profissional responsável',
  room: 'Sala',
  notes: 'Anotações',
  outcome: 'Desfecho',
  role: 'Função',
  department: 'Setor',
  shift: 'Plantão',
  hospital: 'Nome da unidade',
  unit: 'Setor da unidade',
  at: 'Data',
  text: 'Registro',
};
const names: Record<string, string> = {
  triage: 'Aguardando triagem',
  waiting: 'Na fila de atendimento',
  attending: 'Em atendimento',
  finished: 'Finalizado',
  red: 'Vermelho',
  orange: 'Laranja',
  yellow: 'Amarelo',
  green: 'Verde',
  blue: 'Azul',
  ...availability,
};
export default function ConflictVersion({
  value,
  other,
}: {
  value: Record<string, unknown>;
  other: Record<string, unknown>;
}) {
  const { staff } = useStore();
  const format = (key: string, content: unknown) => {
    if (content === null || content === '') return 'Não informado';
    if (key === 'professional')
      return (
        staff.find((person) => person.id === content)?.name || String(content)
      );
    if (key.endsWith('At') || key === 'at') return dateTime(String(content));
    if (key === 'birthDate')
      return String(content).split('-').reverse().join('/');
    return names[String(content)] || String(content);
  };
  const vitals = value.vitals as Record<string, unknown> | undefined;
  const history = value.history as { at: string; text: string }[] | undefined;
  return (
    <div className="desktop-version">
      <dl>
        {Object.entries(labels)
          .filter(([key]) => key in value)
          .map(([key, label]) => (
            <div
              key={key}
              className={
                JSON.stringify(value[key]) !== JSON.stringify(other[key])
                  ? 'changed'
                  : ''
              }
            >
              <dt>{label}</dt>
              <dd>{format(key, value[key])}</dd>
            </div>
          ))}
        {vitals &&
          vitalFields.map((field) => (
            <div
              key={field.key}
              className={
                JSON.stringify(value.vitals) !== JSON.stringify(other.vitals)
                  ? 'changed'
                  : ''
              }
            >
              <dt>{field.label}</dt>
              <dd>
                {vitals[field.key] === null
                  ? 'Não aferido'
                  : `${vitals[field.key]} ${field.unit}`}
              </dd>
            </div>
          ))}
      </dl>
      {history && (
        <details>
          <summary>Histórico do atendimento ({history.length})</summary>
          {history.map((entry, index) => (
            <p key={index}>
              <small>{dateTime(entry.at)}</small>
              <br />
              {entry.text}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
