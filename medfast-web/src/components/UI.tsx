import {
  cloneElement,
  useId,
  type ReactElement,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { store } from '../data/store';
import type { Patient, RiskId, Staff, Status } from '../data/types';
import { age, availability, initials } from '../lib/format';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'amber' | 'danger';
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={`field ${full ? 'field-full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(
        children as ReactElement<{ id: string; 'aria-describedby'?: string }>,
        { id, 'aria-describedby': hint ? `${id}-hint` : undefined },
      )}
      {hint && (
        <small id={`${id}-hint`} className="muted">
          {hint}
        </small>
      )}
    </div>
  );
}
export function Input({
  label,
  hint,
  full,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  full?: boolean;
}) {
  return (
    <Field label={label} hint={hint} full={full}>
      <input {...props} />
    </Field>
  );
}
export function Select({
  label,
  children,
  full,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  full?: boolean;
}) {
  return (
    <Field label={label} full={full}>
      <select {...props}>{children}</select>
    </Field>
  );
}
export function Textarea({
  label,
  full = true,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  full?: boolean;
}) {
  return (
    <Field label={label} full={full}>
      <textarea rows={3} {...props} />
    </Field>
  );
}
export function SearchField({
  label = 'Buscar pacientes',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="rw-search">
      <Search size={18} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        placeholder="Buscar por nome ou código..."
        aria-label={label}
        {...props}
      />
    </label>
  );
}
export function RiskBadge({ risk }: { risk: RiskId | null }) {
  return (
    <span className={`badge risk-${risk || 'none'}`}>
      <span className="badge-dot" />
      {store.risk(risk)?.label || 'Não classificado'}
    </span>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-label status-${status}`}>
      <span className="badge-dot" />
      {store.statuses[status]}
    </span>
  );
}
export function RiskFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      label="Classificação"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">Todas as classificações</option>
      {store.risks.map((r) => (
        <option key={r.id} value={r.id}>
          {r.label}
        </option>
      ))}
      <option value="none">Não classificado</option>
    </Select>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
const staffPhotos = [
  'camila',
  'rafael',
  'mariana',
  'pedro',
  'juliana',
  'lucas',
  'beatriz',
  'andre',
];
export function StaffAvatar({ person }: { person: Staff }) {
  const index = Number(person.id.replace(/\D/g, '')) - 1;
  return (
    <span className="staff-avatar">
      <img
        src={`/assets/images/staff-${staffPhotos[index] || 'camila'}.jpg`}
        alt=""
        loading="lazy"
      />
    </span>
  );
}
export function Availability({ status }: { status: Staff['status'] }) {
  return (
    <span className="rw-availability">
      <span className={`staff-dot ${status}`} />
      {availability[status]}
    </span>
  );
}
export function PatientCell({
  patient,
  onOpen,
}: {
  patient: Patient;
  onOpen: () => void;
}) {
  return (
    <div className="patient-cell">
      <Avatar name={patient.name} />
      <div>
        <button type="button" className="patient-name" onClick={onOpen}>
          {patient.name}
        </button>
        <span className="patient-meta">
          {patient.code} · {age(patient.birthDate)}
        </span>
      </div>
    </div>
  );
}
export function PageHeading({
  eyebrow = 'ACOLHIMENTO E ATENDIMENTO',
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="rw-actions">{children}</div>
    </header>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      className={`card ${className}`}
      aria-labelledby={title ? id : undefined}
    >
      {title && (
        <header className="card-header">
          <div>
            <h2 className="card-title" id={id}>
              {title}
            </h2>
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Metrics({
  items,
}: {
  items: { label: string; value: ReactNode; foot: string; icon?: ReactNode }[];
}) {
  return (
    <div className="stat-grid unit-summary">
      {items.map((item) => (
        <article key={item.label} className="stat-card">
          <div className="stat-top">
            <span className="stat-label">{item.label}</span>
            <span className="stat-icon">{item.icon}</span>
          </div>
          <div className="stat-value">{item.value}</div>
          <div className="stat-foot">{item.foot}</div>
        </article>
      ))}
    </div>
  );
}
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="rw-tabs" aria-label="Filtrar registros">
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          aria-pressed={value === item.value}
          className={value === item.value ? 'active' : ''}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Empty({
  title = 'Nenhum resultado encontrado',
  description = 'Experimente ajustar a busca ou os filtros.',
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rw-empty">
      <Search size={28} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="rw-loading" role="status">
      <span className="rw-loader" />
      <p>Preparando seu espaço de cuidado...</p>
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`rw-notice ${error ? 'rw-error' : ''}`}
      role={error ? 'alert' : undefined}
    >
      {children}
    </div>
  );
}
export function Pagination({
  page,
  total,
  size = 8,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="rw-pagination">
      <span>
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} de ${total} registros`
          : '0 registros'}
      </span>
      <div>
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <span aria-live="polite">
          {page} / {pages}
        </span>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Próxima <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
