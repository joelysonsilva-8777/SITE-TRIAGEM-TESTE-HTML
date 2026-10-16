import React, { useState } from "react";
import { View } from "react-native";
import { useStore } from "../data/StoreProvider";
import { useApp } from "../components/AppContext";
import {
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Notice,
  Select,
  T,
  Tabs,
} from "../components/ui";
import { PatientRow } from "../components/PatientRow";
import { fold } from "../lib/format";
import { exportPatients } from "../lib/export";
import { s } from "../theme";
export function Patients() {
  const { data, store } = useStore(),
    { open, notify } = useApp();
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("active"),
    [risk, setRisk] = useState(""),
    [page, setPage] = useState(1);
  const list = data.patients
    .filter(
      (p) =>
        (status === "all" ||
          (status === "active"
            ? p.status !== "finished"
            : p.status === status)) &&
        (!risk || (risk === "none" ? !p.risk : p.risk === risk)) &&
        fold(p.name + " " + p.code).includes(fold(query)),
    )
    .sort((a, b) => Date.parse(b.arrivalAt) - Date.parse(a.arrivalAt));
  const pages = Math.max(1, Math.ceil(list.length / 8)),
    current = Math.min(page, pages);
  return (
    <View style={s.stack}>
      <Heading
        eyebrow="RECEPÇÃO E CADASTRO"
        title="Pacientes"
        description="Encontre o cadastro, confira os dados e acompanhe cada etapa do atendimento."
      >
        <Button
          variant="secondary"
          label="Exportar"
          icon="download"
          onPress={() =>
            exportPatients(store, list).catch((e) => notify(e.message))
          }
        />
        <Button
          label="Novo paciente"
          icon="plus"
          onPress={() => open({ kind: "new" })}
        />
      </Heading>
      <Tabs
        options={[
          {
            value: "active",
            label: `Em cuidado (${data.patients.filter((p) => p.status !== "finished").length})`,
          },
          { value: "all", label: "Todos os pacientes" },
          { value: "finished", label: "Finalizados" },
        ]}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />
      <View style={s.row}>
        <View style={{ flex: 2, minWidth: 220 }}>
          <Field
            label="Buscar paciente"
            placeholder="Nome ou prontuário…"
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setPage(1);
            }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Select
            label="Classificação"
            value={risk}
            onChange={(v) => {
              setRisk(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "Todas as classificações" },
              { value: "none", label: "Não classificado" },
              ...store.risks.map((r) => ({ value: r.id, label: r.label })),
            ]}
          />
        </View>
      </View>
      <T style={s.muted}>{list.length} pacientes encontrados</T>
      <Card>
        {list.slice((current - 1) * 8, current * 8).map((p) => (
          <PatientRow key={p.id} patient={p} />
        ))}
        {!list.length && <Empty />}
        <View style={[s.pad, s.between]}>
          <T style={s.small}>
            Página {current} de {pages}
          </T>
          <View style={s.row}>
            <Button
              small
              variant="secondary"
              label="Anterior"
              disabled={current === 1}
              onPress={() => setPage(current - 1)}
            />
            <Button
              small
              variant="secondary"
              label="Próxima"
              disabled={current === pages}
              onPress={() => setPage(current + 1)}
            />
          </View>
        </View>
      </Card>
      <Notice>
        Dados fictícios, organizados para uma experiência de cuidado completa.
      </Notice>
    </View>
  );
}
