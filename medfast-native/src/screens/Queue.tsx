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
  Stats,
  T,
} from "../components/ui";
import { PatientRow } from "../components/PatientRow";
import { fold, queue } from "../lib/format";
import { s } from "../theme";
export function Queue() {
  const { store, data } = useStore(),
    { open, navigate } = useApp();
  const [query, setQuery] = useState(""),
    [risk, setRisk] = useState(""),
    [sort, setSort] = useState("priority");
  const waiting = queue(data.patients);
  const list = waiting.filter(
    (p) =>
      (!risk || p.risk === risk) &&
      fold(p.name + " " + p.code).includes(fold(query)),
  );
  if (sort === "arrival")
    list.sort((a, b) => Date.parse(a.arrivalAt) - Date.parse(b.arrivalAt));
  return (
    <View style={s.stack}>
      <Heading
        eyebrow="ORGANIZAÇÃO DO CUIDADO"
        title="Fila de atendimento"
        description="Acompanhe a espera e chame o próximo paciente."
      >
        <Button
          variant="secondary"
          label="Ver triagem"
          onPress={() => navigate("triagem")}
        />
        <Button
          label="Chamar próximo"
          icon="arrow-right"
          disabled={!waiting.length}
          onPress={() => open({ kind: "call", id: waiting[0].id })}
        />
      </Heading>
      <Stats
        items={store.risks.map((r) => ({
          label: r.label,
          value: waiting.filter((p) => p.risk === r.id).length,
          foot: `Prioridade ${r.rank}`,
        }))}
      />
      <View style={s.row}>
        <View style={{ flex: 2, minWidth: 200 }}>
          <Field
            label="Buscar na fila"
            value={query}
            onChangeText={setQuery}
            placeholder="Nome ou prontuário…"
          />
        </View>
        <View style={{ flex: 1, minWidth: 190 }}>
          <Select
            label="Filtrar risco"
            value={risk}
            onChange={setRisk}
            options={[
              { value: "", label: "Todas as classificações" },
              ...store.risks.map((r) => ({ value: r.id, label: r.label })),
            ]}
          />
        </View>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Select
            label="Ordenar fila"
            value={sort}
            onChange={setSort}
            options={[
              { value: "priority", label: "Prioridade e chegada" },
              { value: "arrival", label: "Ordem de chegada" },
            ]}
          />
        </View>
      </View>
      <T style={s.muted}>{list.length} pacientes na fila</T>
      <Card>
        {list.map((p) => (
          <PatientRow key={p.id} patient={p} mode="queue" />
        ))}
        {!list.length && <Empty title="Nenhum paciente nesta fila" />}
      </Card>
      <Notice>
        A prioridade é registrada pelo profissional. O tempo de espera é contado
        desde a chegada.
      </Notice>
    </View>
  );
}
