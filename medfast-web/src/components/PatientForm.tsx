import type { Identity } from '../lib/identity';
import { Input, Select, Textarea } from './UI';
import { localDate } from '../lib/format';

export function PatientForm({
  value,
  onChange,
}: {
  value: Identity;
  onChange: (value: Identity) => void;
}) {
  const set = (key: keyof Identity, text: string) =>
    onChange({ ...value, [key]: text });
  return (
    <div className="form-grid">
      <Input
        label="Nome completo"
        full
        autoComplete="name"
        required
        minLength={3}
        maxLength={150}
        value={value.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <Input
        label="Data de nascimento"
        type="date"
        required
        min="1900-01-01"
        max={localDate()}
        value={value.birthDate}
        onChange={(e) => set('birthDate', e.target.value)}
      />
      <Select
        label="Sexo informado"
        value={value.sex}
        onChange={(e) => set('sex', e.target.value)}
      >
        {['Não informado', 'Feminino', 'Masculino', 'Intersexo', 'Outro'].map(
          (v) => (
            <option key={v}>{v}</option>
          ),
        )}
      </Select>
      <Input
        label="Telefone de contato"
        type="tel"
        autoComplete="tel"
        maxLength={40}
        value={value.phone}
        onChange={(e) => set('phone', e.target.value)}
      />
      <Input
        label="Alergias informadas"
        placeholder="Ex.: nenhuma relatada"
        maxLength={1000}
        value={value.allergies}
        onChange={(e) => set('allergies', e.target.value)}
      />
      <Textarea
        label="Queixa principal"
        required
        minLength={3}
        maxLength={2000}
        value={value.complaint}
        onChange={(e) => set('complaint', e.target.value)}
      />
    </div>
  );
}
