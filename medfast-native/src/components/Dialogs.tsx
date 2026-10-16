import React, { useState } from "react";
import { View } from "react-native";
import { Dialog, Patient } from "../data/types";
import { useStore } from "../data/StoreProvider";
import { useApp } from "./AppContext";
import {
  Avatar,
  Button,
  Check,
  Empty,
  Field,
  Notice,
  Select,
  Sheet,
  T,
} from "./ui";
import { PatientRow, RiskBadge } from "./PatientRow";
import { age, availability, dateTime, fold, vitalFields } from "../lib/format";
import { printPatients } from "../lib/export";
import { clearTriageDrafts } from "../screens/Triage";
import { s } from "../theme";
const sexes = ["Não informado", "Feminino", "Masculino", "Intersexo", "Outro"];
const outcomes = [
  "Alta registrada",
  "Internação",
  "Transferência",
  "Encaminhamento",
  "Saída antes da conclusão",
  "Outro desfecho",
];
function Registration({ patient }: { patient?: Patient }) {
  const { store } = useStore(),
    { close, notify, navigate } = useApp();
  const [form, setForm] = useState({
      name: patient?.name || "",
      birthDate: patient?.birthDate || "",
      sex: patient?.sex || "Não informado",
      phone: patient?.phone || "",
      complaint: patient?.complaint || "",
      allergies: patient?.allergies || "",
      notes: patient?.notes || "",
    }),
    [error, setError] = useState("");
  function save(triage = false) {
    try {
      if (form.name.trim().length < 3)
        throw new Error("Informe o nome completo do paciente.");
      const p = patient
        ? store.updatePatient(patient.id, form)
        : store.addPatient(form);
      close();
      notify(
        patient
          ? "Cadastro atualizado."
          : "Paciente recebido e encaminhado à triagem.",
      );
      if (triage && p) navigate("triagem", p.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      {!!error && <Notice error>{error}</Notice>}
      <T style={s.muted}>
        Preencha os dados informados pelo paciente. Use somente dados fictícios.
      </T>
      <Field
        label="Nome completo *"
        value={form.name}
        onChangeText={(name) => setForm({ ...form, name })}
        maxLength={150}
      />
      <Field
        label="Data de nascimento (AAAA-MM-DD)"
        value={form.birthDate}
        onChangeText={(birthDate) => setForm({ ...form, birthDate })}
        placeholder="1990-05-12"
        maxLength={10}
      />
      <Select
        label="Sexo registrado"
        value={form.sex}
        onChange={(sex) => setForm({ ...form, sex })}
        options={sexes.map((v) => ({ value: v, label: v }))}
      />
      <Field
        label="Telefone"
        keyboardType="phone-pad"
        value={form.phone}
        onChangeText={(phone) => setForm({ ...form, phone })}
      />
      <Field
        label="Queixa principal"
        multiline
        value={form.complaint}
        onChangeText={(complaint) => setForm({ ...form, complaint })}
      />
      <Field
        label="Alergias relatadas"
        multiline
        value={form.allergies}
        onChangeText={(allergies) => setForm({ ...form, allergies })}
      />
      <Field
        label="Observações"
        multiline
        value={form.notes}
        onChangeText={(notes) => setForm({ ...form, notes })}
      />
      <View style={s.row}>
        <Button
          label={patient ? "Salvar alterações" : "Cadastrar paciente"}
          onPress={() => save()}
        />
        {!patient && (
          <Button
            variant="secondary"
            label="Cadastrar e iniciar triagem"
            onPress={() => save(true)}
          />
        )}
      </View>
    </>
  );
}
function Detail({ patient: p }: { patient: Patient }) {
  const { store } = useStore(),
    { open, navigate, notify } = useApp();
  return (
    <>
      <View style={s.row}>
        <Avatar name={p.name} size={56} />
        <View style={s.flex}>
          <T style={s.h2}>{p.name}</T>
          <T style={s.muted}>
            {p.code} · {age(p.birthDate)}
          </T>
        </View>
      </View>
      <RiskBadge risk={p.risk} />
      <T>{store.statuses[p.status]}</T>
      <View style={s.row}>
        <Button
          variant="secondary"
          label="Editar cadastro"
          onPress={() => open({ kind: "edit", id: p.id })}
        />
        <Button
          variant="ghost"
          label="Imprimir ficha"
          icon="printer"
          onPress={() =>
            printPatients(store, [p], "Ficha do paciente").catch((e) =>
              notify(e.message),
            )
          }
        />
        {p.status === "triage" && (
          <Button
            label="Iniciar triagem"
            onPress={() => navigate("triagem", p.id)}
          />
        )}
      </View>
      {Object.entries({
        Nascimento: p.birthDate,
        Sexo: p.sex,
        Telefone: p.phone,
        "Queixa principal": p.complaint,
        "Alergias relatadas": p.allergies,
        Chegada: dateTime(p.arrivalAt),
        Profissional: store.staff().find((s) => s.id === p.professional)?.name,
        Local: p.room,
        Observações: p.notes,
        Desfecho: p.outcome,
      }).map(([label, value]) => (
        <View key={label}>
          <T style={s.eyebrow}>{label.toUpperCase()}</T>
          <T selectable>{value || "Não informado"}</T>
        </View>
      ))}
      <T style={s.h3}>Sinais vitais</T>
      {vitalFields.map((v) => (
        <T key={v.key}>
          {v.label}: {p.vitals[v.key] ?? "—"} {v.unit}
        </T>
      ))}
      <T style={s.h3}>Histórico do atendimento</T>
      {[...p.history].reverse().map((h, i) => (
        <View
          key={i}
          style={{
            gap: 4,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#DCE5EF",
          }}
        >
          <T style={s.eyebrow}>{dateTime(h.at)}</T>
          <T selectable>{h.text}</T>
        </View>
      ))}
    </>
  );
}
function CareForm({
  patient,
  kind,
}: {
  patient: Patient;
  kind: "call" | "assign" | "evolution" | "finish";
}) {
  const { store, data } = useStore(),
    { close, notify } = useApp();
  const [professional, setProfessional] = useState(patient.professional || ""),
    [room, setRoom] = useState(patient.room || ""),
    [note, setNote] = useState(""),
    [outcome, setOutcome] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState("");
  const assignment = kind === "call" || kind === "assign";
  function save() {
    try {
      const current = store.patient(patient.id);
      if (!current) throw new Error("Paciente não encontrado.");
      if (
        (kind === "call" && current.status !== "waiting") ||
        (kind !== "call" && current.status !== "attending")
      )
        throw new Error(
          "A situação deste atendimento mudou. Confira o registro.",
        );
      const staff = data.staff.find((p) => p.id === professional);
      if (!staff) throw new Error("Selecione o profissional responsável.");
      if (assignment) {
        if (!room.trim()) throw new Error("Informe o local do atendimento.");
        store.updatePatient(patient.id, {
          professional,
          room,
          ...(kind === "call" ? { status: "attending" as const } : {}),
        });
        store.addEvent(
          patient.id,
          `${kind === "call" ? "Atendimento iniciado" : "Responsável e local atualizados"}: ${staff.name} · ${room.trim()}.`,
        );
      } else {
        if (note.trim().length < 10)
          throw new Error(
            "Registre as observações com pelo menos 10 caracteres.",
          );
        if (kind === "finish" && (!outcome || !confirmed))
          throw new Error("Selecione o desfecho e confirme a conclusão.");
        const text =
          kind === "finish"
            ? `Conclusão · ${outcome} · ${staff.name}: ${note.trim()}`
            : `Evolução · ${staff.name}: ${note.trim()}`;
        store.updatePatient(patient.id, {
          notes: [current.notes, text].filter(Boolean).join("\n\n"),
          ...(kind === "finish"
            ? { status: "finished" as const, outcome }
            : {}),
        });
        store.addEvent(patient.id, text);
      }
      close();
      notify(
        kind === "finish"
          ? "Atendimento concluído."
          : kind === "evolution"
            ? "Evolução registrada."
            : "Atendimento atualizado.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <T style={s.h2}>{patient.name}</T>
      <T style={s.muted}>{patient.code}</T>
      <RiskBadge risk={patient.risk} />
      {!!error && <Notice error>{error}</Notice>}
      <Select
        label="Profissional responsável *"
        value={professional}
        onChange={setProfessional}
        options={[
          { value: "", label: "Selecione um profissional" },
          ...data.staff.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.role}`,
          })),
        ]}
      />
      {assignment ? (
        <Field
          label="Local de atendimento *"
          value={room}
          onChangeText={setRoom}
          placeholder="Ex.: Consultório 03"
          maxLength={60}
        />
      ) : (
        <>
          {kind === "finish" && (
            <Select
              label="Desfecho registrado *"
              value={outcome}
              onChange={setOutcome}
              options={[
                { value: "", label: "Selecione o desfecho" },
                ...outcomes.map((v) => ({ value: v, label: v })),
              ]}
            />
          )}
          <Field
            label={
              kind === "finish"
                ? "Observações de encerramento *"
                : "Evolução do atendimento *"
            }
            multiline
            value={note}
            onChangeText={setNote}
            maxLength={5000}
          />
          {kind === "finish" && (
            <Check
              label="Confirmo que o desfecho foi definido pelo profissional responsável."
              checked={confirmed}
              onChange={setConfirmed}
            />
          )}
        </>
      )}
      <Button
        label={
          kind === "finish"
            ? "Concluir e salvar registro"
            : kind === "evolution"
              ? "Salvar evolução"
              : kind === "call"
                ? "Confirmar início"
                : "Salvar alterações"
        }
        onPress={save}
      />
    </>
  );
}
function Settings({ unit = false }: { unit?: boolean }) {
  const { store, data } = useStore(),
    { notify, close, open } = useApp();
  const [values, setValues] = useState(data.settings),
    [error, setError] = useState("");
  return (
    <>
      {!!error && <Notice error>{error}</Notice>}
      <Field
        label="Nome do perfil"
        value={values.userName}
        onChangeText={(userName) => setValues({ ...values, userName })}
      />
      {unit && (
        <>
          <Field
            label="Hospital"
            value={values.hospital}
            onChangeText={(hospital) => setValues({ ...values, hospital })}
          />
          <Field
            label="Unidade"
            value={values.unit}
            onChangeText={(unit) => setValues({ ...values, unit })}
          />
        </>
      )}
      <Button
        label="Salvar configurações"
        onPress={() => {
          try {
            store.updateSettings(values);
            close();
            notify("Configurações atualizadas.");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      <Notice>
        Perfil e unidade demonstrativos. Os dados ficam neste dispositivo.
      </Notice>
      <Button
        variant="secondary"
        label="Restaurar dados de demonstração"
        onPress={() => open({ kind: "reset" })}
      />
    </>
  );
}
function Search() {
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const found = data.patients
    .filter((p) => fold(p.name + " " + p.code).includes(fold(query)))
    .slice(0, 12);
  return (
    <>
      <Field
        label="Buscar por nome ou prontuário"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      {found.map((p) => (
        <PatientRow key={p.id} patient={p} mode="compact" />
      ))}
      {!found.length && <Empty />}
    </>
  );
}
export function Dialogs({ dialog }: { dialog: Dialog }) {
  const { store, data } = useStore(),
    { close, notify, navigate } = useApp();
  const p = "id" in dialog && dialog.id ? store.patient(dialog.id) : null;
  const titles: Record<Dialog["kind"], string> = {
    new: "Receber paciente",
    edit: "Editar cadastro",
    detail: "Ficha do paciente",
    call: "Iniciar atendimento",
    assign: "Profissional e local",
    evolution: "Registrar evolução",
    finish: "Concluir atendimento",
    profile: "Meu perfil",
    unit: "Unidade de atendimento",
    help: "Central de ajuda",
    events: "Atividade recente",
    search: "Buscar paciente",
    shifts: "Escala da equipe",
    reset: "Restaurar demonstração",
    staff: "Perfil do profissional",
  };
  let content: React.ReactNode;
  if (dialog.kind === "new") content = <Registration />;
  else if (dialog.kind === "edit" && p) content = <Registration patient={p} />;
  else if (dialog.kind === "detail" && p) content = <Detail patient={p} />;
  else if (["call", "assign", "evolution", "finish"].includes(dialog.kind) && p)
    content = (
      <CareForm
        patient={p}
        kind={dialog.kind as "call" | "assign" | "evolution" | "finish"}
      />
    );
  else if (dialog.kind === "profile" || dialog.kind === "unit")
    content = <Settings unit={dialog.kind === "unit"} />;
  else if (dialog.kind === "search") content = <Search />;
  else if (dialog.kind === "reset")
    content = (
      <>
        <Notice>
          Esta ação substitui os cadastros, atendimentos e configurações locais
          pelos exemplos iniciais.
        </Notice>
        <Button
          variant="danger"
          label="Confirmar restauração"
          onPress={() => {
            store.reset();
            clearTriageDrafts();
            navigate("dashboard");
            notify("Dados de demonstração restaurados.");
          }}
        />
        <Button variant="secondary" label="Cancelar" onPress={close} />
      </>
    );
  else if (dialog.kind === "shifts")
    content = (
      <>
        {data.staff.map((person) => (
          <View key={person.id} style={{ gap: 5, paddingVertical: 10 }}>
            <T style={s.h3}>{person.name}</T>
            <T>
              {person.role} · {person.department}
            </T>
            <T>
              {person.shift} · {availability[person.status]}
            </T>
          </View>
        ))}
        <Notice>
          A disponibilidade reflete a atualização manual feita nesta
          demonstração.
        </Notice>
      </>
    );
  else if (dialog.kind === "staff") {
    const person = data.staff.find((s) => s.id === dialog.id);
    content = person ? (
      <>
        <Avatar name={person.name} id={person.id} size={90} />
        <T style={s.h2}>{person.name}</T>
        <T>
          {person.role} · {person.department}
        </T>
        <T>
          {person.shift} · {availability[person.status]}
        </T>
        <T style={s.h3}>Pacientes em acompanhamento</T>
        {data.patients
          .filter(
            (p) => p.professional === person.id && p.status !== "finished",
          )
          .map((p) => (
            <PatientRow key={p.id} patient={p} mode="compact" />
          ))}
      </>
    ) : (
      <Empty />
    );
  } else if (dialog.kind === "events")
    content = (
      <>
        {data.events.slice(0, 40).map((e) => (
          <View key={e.id} style={{ gap: 6, paddingVertical: 10 }}>
            <T style={s.eyebrow}>{dateTime(e.at)}</T>
            <T style={s.h3}>
              {data.patients.find((p) => p.id === e.patientId)?.name}
            </T>
            <T>{e.text}</T>
          </View>
        ))}
      </>
    );
  else if (dialog.kind === "help")
    content = (
      <>
        <T style={s.h2}>Um paciente de cada vez.</T>
        <T>1. Receba o paciente em Pacientes e confira os dados.</T>
        <T>2. Na Triagem, registre a avaliação e a classificação manual.</T>
        <T>3. Na Fila, chame o paciente e indique profissional e local.</T>
        <T>4. Em Atendimentos, registre a evolução e a conclusão.</T>
        <T>5. Consulte a equipe e exporte os relatórios do período.</T>
        <Notice>
          Demonstração com dados fictícios. Não possui autenticação, backend ou
          validação para uso assistencial.
        </Notice>
        <T style={s.muted}>
          No navegador: Ctrl/Cmd + K abre a busca. Esc fecha a janela.
        </T>
      </>
    );
  else content = <Empty title="Registro não encontrado" />;
  return (
    <Sheet title={titles[dialog.kind]} onClose={close}>
      {content}
    </Sheet>
  );
}
