import { ArrowRight, Pencil } from 'lucide-react';
import { Link } from 'react-router';
import type { Patient } from '../data/types';
import { dateTime, duration, waitMinutes } from '../lib/format';
import { useFeedback } from './Feedback';
import {
  Button,
  Empty,
  IconButton,
  PatientCell,
  RiskBadge,
  StatusBadge,
} from './UI';

export function PatientTable({
  patients,
  mode = 'registry',
}: {
  patients: Patient[];
  mode?: 'registry' | 'queue' | 'care' | 'report';
}) {
  const { open } = useFeedback();
  if (!patients.length) return <Empty />;
  return (
    <div className="table-wrap">
      <table className="data-table rw-patient-table">
        <caption className="sr-only">Registros de pacientes</caption>
        <thead>
          <tr>
            {mode === 'queue' && <th>Ordem</th>}
            <th>Paciente</th>
            <th>Classificação</th>
            <th>{mode === 'queue' ? 'Espera desde a chegada' : 'Situação'}</th>
            <th>{mode === 'care' ? 'Sala' : 'Chegada'}</th>
            <th className="rw-print-hide">Ações</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p, i) => (
            <tr key={p.id}>
              {mode === 'queue' && (
                <td className="queue-position">
                  {String(i + 1).padStart(2, '0')}
                </td>
              )}
              <td>
                <PatientCell
                  patient={p}
                  onOpen={() => open({ kind: 'detail', id: p.id })}
                />
              </td>
              <td>
                <RiskBadge risk={p.risk} />
              </td>
              <td>
                {mode === 'queue' ? (
                  <span className="rw-nowrap">{duration(waitMinutes(p))}</span>
                ) : (
                  <StatusBadge status={p.status} />
                )}
              </td>
              <td className="rw-nowrap">
                {mode === 'care'
                  ? p.room || 'Não definida'
                  : dateTime(p.arrivalAt)}
              </td>
              <td className="rw-print-hide">
                <div className="rw-actions">
                  {mode === 'registry' && (
                    <IconButton
                      label={`Editar ${p.name}`}
                      onClick={() => open({ kind: 'edit', id: p.id })}
                    >
                      <Pencil size={16} />
                    </IconButton>
                  )}
                  {p.status === 'triage' && mode !== 'report' ? (
                    <Link
                      className="btn btn-secondary btn-sm"
                      to={`/triagem?paciente=${p.id}`}
                    >
                      Triar <ArrowRight size={14} />
                    </Link>
                  ) : p.status === 'waiting' && mode !== 'report' ? (
                    <Button
                      className="btn-sm"
                      onClick={() => open({ kind: 'call', id: p.id })}
                    >
                      Chamar <ArrowRight size={14} />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="btn-sm"
                      onClick={() => open({ kind: 'detail', id: p.id })}
                    >
                      Ver ficha
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
