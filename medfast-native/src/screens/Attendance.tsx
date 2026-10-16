import React, { useState } from "react";
import { View } from "react-native";
import { useStore } from "../data/StoreProvider";
import {
  Card,
  Empty,
  Field,
  Heading,
  Select,
  Stats,
  Tabs,
} from "../components/ui";
import { PatientRow } from "../components/PatientRow";
import { fold, today } from "../lib/format";
import { s } from "../theme";
export function Attendance() {
  const { data, store } = useStore();
  const [status, setStatus] = useState("attending"),
    [query, setQuery] = useState(""),
    [professional, setProfessional] = useState(""),
    [risk, setRisk] = useState(""),
    [layout, setLayout] = useState("list");
  const attending = data.patients.filter((p) => p.status === "attending"),
    finished = data.patients.filter(
      (p) => p.status === "finished" && p.finishedAt && today(p.finishedAt),
    );
  const list = data.patients.filter(
    (p) =>
      (status === "finished"
        ? finished.some((f) => f.id === p.id)
        : p.status === status) &&
      (!professional || p.professional === professional) &&
      (!risk || p.risk === risk) &&
      fold(p.name + " " + p.code + " " + p.room).includes(fold(query)),
  );
  return (
    <View style={s.stack}>
      <Heading
        eyebrow="CONTINUIDADE DO CUIDADO"
        title="Atendimentos"
        description="Acompanhe os atendimentos, registre a evolução e organize a conclusão."
      />
      <Stats
        items={[
          {
            label: "Em atendimento",
            value: attending.length,
            foot: "Com a equipe",
          },
          {
            label: "Aguardando",
            value: data.patients.filter((p) => p.status === "waiting").length,
            foot: "Na fila de atendimento",
          },
          {
            label: "Concluídos hoje",
            value: finished.length,
            foot: "Registros finalizados",
          },
          {
            label: "Locais ocupados",
            value: new Set(attending.map((p) => p.room).filter(Boolean)).size,
            foot: "Salas com atendimento",
          },
        ]}
      />
      <Tabs
        value={status}
        onChange={setStatus}
        options={[
          { value: "attending", label: "Em atendimento" },
          { value: "waiting", label: "Aguardando" },
          { value: "finished", label: "Concluídos hoje" },
        ]}
      />
      <Field
        label="Buscar atendimento"
        placeholder="Nome, prontuário ou sala…"
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.row}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Select
            label="Profissional"
            value={professional}
            onChange={setProfessional}
            options={[
              { value: "", label: "Todos os profissionais" },
              ...data.staff.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </View>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Select
            label="Risco"
            value={risk}
            onChange={setRisk}
            options={[
              { value: "", label: "Todas as classificações" },
              ...store.risks.map((r) => ({ value: r.id, label: r.label })),
            ]}
          />
        </View>
      </View>
      <Tabs
        value={layout}
        onChange={setLayout}
        options={[
          { value: "list", label: "Lista" },
          { value: "cards", label: "Cartões" },
        ]}
      />
      {layout === "list" ? (
        <Card>
          {list.map((p) => (
            <PatientRow key={p.id} patient={p} mode="care" />
          ))}
          {!list.length && <Empty />}
        </Card>
      ) : (
        <View style={[s.row, { alignItems: "stretch" }]}>
          {list.map((p) => (
            <Card key={p.id} style={{ flexGrow: 1, flexBasis: 340 }}>
              <PatientRow patient={p} mode="care" />
            </Card>
          ))}
          {!list.length && <Empty />}
        </View>
      )}
    </View>
  );
}
