import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useStore } from "../data/StoreProvider";
import { useApp } from "../components/AppContext";
import { Patient, RiskId, VitalKey, Vitals } from "../data/types";
import {
  Avatar,
  Button,
  Card,
  Check,
  Columns,
  Empty,
  Field,
  Heading,
  Notice,
  Select,
  T,
  Tabs,
} from "../components/ui";
import { RiskBadge } from "../components/PatientRow";
import { age, fold, vitalFields } from "../lib/format";
import { colors, s } from "../theme";
type Draft = {
  name: string;
  birthDate: string;
  sex: string;
  phone: string;
  complaint: string;
  allergies: string;
  professional: string;
  risk: string;
  rationale: string;
  destination: string;
  confirmed: boolean;
  vitals: Record<VitalKey, string>;
};
// Keep unfinished assessments when changing tabs, without mixing them into saved records.
const drafts = new Map<string, { draft: Draft; step: number }>();
export function clearTriageDrafts() {
  drafts.clear();
}
function initial(p: Patient): Draft {
  return {
    name: p.name,
    birthDate: p.birthDate,
    sex: p.sex,
    phone: p.phone,
    complaint: p.complaint,
    allergies: p.allergies,
    professional: "",
    risk: "",
    rationale: "",
    destination: "waiting",
    confirmed: false,
    vitals: Object.fromEntries(
      vitalFields.map((v) => [
        v.key,
        p.vitals[v.key] == null ? "" : String(p.vitals[v.key]),
      ]),
    ) as Draft["vitals"],
  };
}
export function Triage({ patientId }: { patientId?: string }) {
  const { data, store } = useStore(),
    { navigate, notify } = useApp();
  const [selected, setSelected] = useState(patientId || ""),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState<Draft | null>(() => {
      const p = patientId ? store.patient(patientId) : null;
      return p ? drafts.get(p.id)?.draft || initial(p) : null;
    }),
    [step, setStep] = useState(
      patientId ? drafts.get(patientId)?.step || 0 : 0,
    ),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<Patient | null>(null),
    [discard, setDiscard] = useState(false);
  const pending = data.patients
      .filter((p) => p.status === "triage")
      .sort((a, b) => Date.parse(a.arrivalAt) - Date.parse(b.arrivalAt)),
    patient = selected ? store.patient(selected) : null;
  function pick(p: Patient) {
    const prior = drafts.get(p.id);
    setSelected(p.id);
    setDraft(prior ? { ...prior.draft, confirmed: false } : initial(p));
    setStep(prior?.step || 0);
    setError("");
    setSaved(null);
    setDiscard(false);
  }
  function change(patch: Partial<Draft>) {
    if (!draft) return;
    const next = { ...draft, ...patch };
    if (next.risk !== "red") next.destination = "waiting";
    setDraft(next);
    drafts.set(selected, { draft: next, step });
  }
  function go(next: number) {
    setStep(next);
    if (draft) drafts.set(selected, { draft, step: next });
    setError("");
  }
  function validate(all = false) {
    if (!draft) return false;
    if (step === 0 || all) {
      if (draft.name.trim().length < 3)
        return fail("Informe o nome completo do paciente.");
      if (!draft.complaint.trim())
        return fail("Descreva a queixa principal para continuar.");
      if (draft.birthDate) {
        const date = new Date(draft.birthDate + "T12:00:00");
        const day = String(date.getDate()).padStart(2, "0");
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate) ||
          Number.isNaN(+date) ||
          date.getFullYear() < 1850 ||
          day !== draft.birthDate.slice(-2) ||
          date > new Date(new Date().setHours(23, 59, 59, 999))
        )
          return fail(
            "Informe uma data de nascimento válida no formato AAAA-MM-DD.",
          );
      }
    }
    if (step === 1 || all) {
      for (const v of vitalFields) {
        const raw = draft.vitals[v.key],
          number = Number(raw.replace(",", "."));
        if (
          raw.trim() &&
          (!Number.isFinite(number) || number < v.min || number > v.max)
        )
          return fail(
            `${v.label}: informe um valor entre ${v.min} e ${v.max} ${v.unit}.`,
          );
      }
      if (!store.risk(draft.risk))
        return fail("Selecione a classificação definida pelo profissional.");
      if (
        !data.staff.some(
          (p) => p.id === draft.professional && /enfermeir[oa]/i.test(p.role),
        )
      )
        return fail("Selecione o enfermeiro ou a enfermeira responsável.");
      if (draft.rationale.trim().length < 10)
        return fail(
          "Descreva os achados e a justificativa com ao menos 10 caracteres.",
        );
    }
    if ((step === 2 || all) && !draft.confirmed)
      return fail("Confirme a revisão antes de registrar a triagem.");
    return true;
  }
  function fail(message: string) {
    setError(message);
    return false;
  }
  function submit() {
    if (!validate()) return;
    if (step < 2) {
      go(step + 1);
      return;
    }
    if (!validate(true) || !draft || !patient) return;
    try {
      const current = store.patient(patient.id);
      if (current?.status !== "triage")
        throw new Error(
          "Este paciente já saiu da triagem. Selecione outro registro.",
        );
      const status =
        draft.risk === "red" && draft.destination === "attending"
          ? "attending"
          : "waiting";
      const vitals = Object.fromEntries(
        vitalFields.map((v) => [
          v.key,
          draft.vitals[v.key].trim()
            ? Number(draft.vitals[v.key].replace(",", "."))
            : null,
        ]),
      ) as Vitals;
      store.updatePatient(patient.id, {
        name: draft.name,
        birthDate: draft.birthDate,
        sex: draft.sex,
        phone: draft.phone,
        complaint: draft.complaint,
        allergies: draft.allergies,
        professional: draft.professional,
        risk: draft.risk as RiskId,
        vitals,
        status,
        notes: [current.notes, `Triagem: ${draft.rationale.trim()}`]
          .filter(Boolean)
          .join("\n\n"),
      });
      store.addEvent(
        patient.id,
        `Triagem registrada por ${data.staff.find((p) => p.id === draft.professional)?.name}. ${draft.rationale.trim()}${status === "attending" ? " Atendimento imediato confirmado pela equipe." : ""}`,
      );
      drafts.delete(patient.id);
      setSaved(store.patient(patient.id));
      setDraft(null);
      notify("Triagem registrada com sucesso.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const nurses = data.staff.filter((p) => /enfermeir[oa]/i.test(p.role));
  return (
    <View style={s.stack}>
      <Heading
        eyebrow="ACOLHIMENTO · ENFERMAGEM"
        title="Triagem"
        description="Confira a identificação, escute o relato e registre a avaliação do paciente."
      >
        <Button
          variant="secondary"
          label="Ver fila"
          onPress={() => navigate("fila")}
        />
      </Heading>
      <Notice>
        Demonstração · Classificação registrada pelo profissional, conforme
        protocolo institucional.
      </Notice>
      {saved ? (
        <Card>
          <View style={s.pad}>
            <T style={s.eyebrow}>TRIAGEM REGISTRADA</T>
            <T style={s.h2}>Triagem concluída e registrada.</T>
            <T>
              A classificação de {saved.name} foi salva e o atendimento foi
              atualizado.
            </T>
            <RiskBadge risk={saved.risk} />
            <T>{store.statuses[saved.status]}</T>
            <Button
              label="Próxima triagem"
              onPress={() => {
                setSaved(null);
                setSelected("");
              }}
            />
            <Button
              variant="secondary"
              label="Acompanhar atendimento"
              onPress={() =>
                navigate(saved.status === "attending" ? "atendimentos" : "fila")
              }
            />
          </View>
        </Card>
      ) : (
        <Columns>
          <Card
            title={`Aguardando triagem (${pending.length})`}
            subtitle="Ordem de chegada à unidade"
          >
            <View style={s.pad}>
              <Field
                label="Buscar na triagem"
                value={query}
                onChangeText={setQuery}
              />
              {pending
                .filter((p) =>
                  fold(p.name + " " + p.code).includes(fold(query)),
                )
                .map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar ${p.name}`}
                    onPress={() => pick(p)}
                    style={[
                      s.row,
                      {
                        padding: 12,
                        backgroundColor:
                          p.id === selected ? colors.light : colors.white,
                        flexWrap: "nowrap",
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Avatar name={p.name} />
                    <View style={s.flex}>
                      <T style={s.h3}>{p.name}</T>
                      <T style={[s.small, s.muted]}>
                        {p.code} · {age(p.birthDate)}
                      </T>
                    </View>
                  </Pressable>
                ))}
              {!pending.length && (
                <Empty
                  title="Nenhum paciente aguardando"
                  description="Os novos cadastros aparecerão aqui."
                />
              )}
            </View>
          </Card>
          <Card>
            {patient && draft ? (
              <View style={s.pad}>
                <T style={s.eyebrow}>
                  ATENDIMENTO {patient.code} · RASCUNHO NESTA SESSÃO
                </T>
                <T style={s.h2}>{patient.name}</T>
                <Tabs
                  value={String(step)}
                  options={["Identificação", "Avaliação", "Revisão"].map(
                    (label, i) => ({
                      value: String(i),
                      label: `${i + 1}. ${label}`,
                    }),
                  )}
                  onChange={(v) => {
                    const next = Number(v);
                    if (next <= step) go(next);
                    else if (validate()) go(Math.min(step + 1, next));
                  }}
                />
                {!!error && <Notice error>{error}</Notice>}
                {step === 0 && (
                  <>
                    <T style={s.h3}>Vamos conhecer o paciente</T>
                    <Field
                      label="Nome completo *"
                      value={draft.name}
                      onChangeText={(name) => change({ name })}
                    />
                    <Field
                      label="Data de nascimento (AAAA-MM-DD)"
                      placeholder="1990-05-12"
                      value={draft.birthDate}
                      onChangeText={(birthDate) => change({ birthDate })}
                      maxLength={10}
                    />
                    <Select
                      label="Sexo registrado"
                      value={draft.sex}
                      onChange={(sex) => change({ sex })}
                      options={[
                        "Não informado",
                        "Feminino",
                        "Masculino",
                        "Intersexo",
                        "Outro",
                      ].map((v) => ({ value: v, label: v }))}
                    />
                    <Field
                      label="Telefone de contato"
                      keyboardType="phone-pad"
                      value={draft.phone}
                      onChangeText={(phone) => change({ phone })}
                    />
                    <Field
                      label="Queixa principal *"
                      multiline
                      value={draft.complaint}
                      onChangeText={(complaint) => change({ complaint })}
                    />
                    <Field
                      label="Alergias relatadas"
                      multiline
                      value={draft.allergies}
                      onChangeText={(allergies) => change({ allergies })}
                    />
                  </>
                )}
                {step === 1 && (
                  <>
                    <T style={s.h3}>Avaliação e classificação</T>
                    <View style={s.row}>
                      {vitalFields.map((v) => (
                        <View
                          key={v.key}
                          style={{ flexGrow: 1, flexBasis: 180 }}
                        >
                          <Field
                            label={`${v.label} (${v.unit})`}
                            keyboardType="decimal-pad"
                            value={draft.vitals[v.key]}
                            onChangeText={(value) =>
                              change({
                                vitals: { ...draft.vitals, [v.key]: value },
                              })
                            }
                          />
                        </View>
                      ))}
                    </View>
                    <T style={[s.small, s.muted]}>
                      Deixe em branco o que não foi aferido. Os valores não
                      geram uma classificação automática.
                    </T>
                    <Select
                      label="Classificação de risco *"
                      value={draft.risk}
                      onChange={(risk) => change({ risk })}
                      options={[
                        { value: "", label: "Selecione a classificação" },
                        ...store.risks.map((r) => ({
                          value: r.id,
                          label: r.label,
                        })),
                      ]}
                    />
                    <Select
                      label="Enfermeiro(a) responsável *"
                      value={draft.professional}
                      onChange={(professional) => change({ professional })}
                      options={[
                        { value: "", label: "Selecione um profissional" },
                        ...nurses.map((p) => ({ value: p.id, label: p.name })),
                      ]}
                    />
                    <Field
                      label="Achados e justificativa *"
                      multiline
                      maxLength={4000}
                      value={draft.rationale}
                      onChangeText={(rationale) => change({ rationale })}
                    />
                  </>
                )}
                {step === 2 && (
                  <>
                    <T style={s.h3}>Revise antes de registrar</T>
                    <T>
                      {draft.name} · {age(draft.birthDate)}
                    </T>
                    <RiskBadge risk={draft.risk as RiskId} />
                    <T>Queixa: {draft.complaint}</T>
                    <T>Alergias: {draft.allergies || "Não informado"}</T>
                    <T>
                      Profissional:{" "}
                      {nurses.find((p) => p.id === draft.professional)?.name}
                    </T>
                    <T>Justificativa: {draft.rationale}</T>
                    {vitalFields
                      .filter((v) => draft.vitals[v.key])
                      .map((v) => (
                        <T key={v.key}>
                          {v.label}: {draft.vitals[v.key]} {v.unit}
                        </T>
                      ))}
                    {draft.risk === "red" ? (
                      <Select
                        label="Destino após o registro"
                        value={draft.destination}
                        onChange={(destination) => change({ destination })}
                        options={[
                          { value: "waiting", label: "Fila de atendimento" },
                          {
                            value: "attending",
                            label: "Atendimento imediato iniciado",
                          },
                        ]}
                      />
                    ) : (
                      <Notice>
                        Após o registro, o paciente entrará na fila de
                        atendimento.
                      </Notice>
                    )}
                    <Check
                      label="Revisei os dados e confirmo a classificação registrada pelo profissional responsável."
                      checked={draft.confirmed}
                      onChange={(confirmed) => change({ confirmed })}
                    />
                  </>
                )}
                {discard && (
                  <Notice>
                    Descartar as informações não registradas desta triagem?
                  </Notice>
                )}
                <View style={s.between}>
                  {step > 0 ? (
                    <Button
                      variant="ghost"
                      label="Voltar"
                      onPress={() => go(step - 1)}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      label={
                        discard ? "Confirmar descarte" : "Descartar rascunho"
                      }
                      onPress={() => {
                        if (!discard) {
                          setDiscard(true);
                          return;
                        }
                        drafts.delete(selected);
                        setDraft(initial(patient));
                        setDiscard(false);
                      }}
                    />
                  )}
                  <Button
                    label={step === 2 ? "Registrar triagem" : "Continuar"}
                    icon="arrow-right"
                    onPress={submit}
                  />
                </View>
              </View>
            ) : (
              <View style={s.pad}>
                <T style={s.eyebrow}>SALA DE TRIAGEM</T>
                <T style={[s.h2, { color: colors.green }]}>
                  O atendimento começa pela escuta.
                </T>
                <T>
                  Selecione uma pessoa na lista de espera para abrir seu
                  registro.
                </T>
                {[
                  "Confirme a identificação e o motivo da procura.",
                  "Registre a avaliação e a classificação definida.",
                  "Revise os dados e informe o próximo passo.",
                ].map((text, i) => (
                  <T key={text}>
                    {i + 1}. {text}
                  </T>
                ))}
                <Button
                  label="Iniciar próxima triagem"
                  disabled={!pending.length}
                  onPress={() => pick(pending[0])}
                />
              </View>
            )}
          </Card>
        </Columns>
      )}
    </View>
  );
}
