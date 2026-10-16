import React, { useState } from "react";
import { View } from "react-native";
import { useStore } from "../data/StoreProvider";
import { useApp } from "../components/AppContext";
import {
  Button,
  Card,
  Columns,
  Empty,
  Field,
  Heading,
  Notice,
  Stats,
  T,
  Tabs,
} from "../components/ui";
import { PatientRow } from "../components/PatientRow";
import { FlowChart, RiskChart } from "../components/Charts";
import { localDate } from "../lib/format";
import { exportPatients, printPatients } from "../lib/export";
import { s } from "../theme";
function fromDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
  return localDate(d);
}
export function Reports() {
  const { data, store } = useStore(),
    { notify } = useApp();
  const [preset, setPreset] = useState("7"),
    [from, setFrom] = useState(fromDays(7)),
    [to, setTo] = useState(localDate()),
    [showAll, setShowAll] = useState(false);
  const valid = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) && localDate(new Date(v + "T12:00:00")) === v;
  const error =
    !valid(from) || !valid(to)
      ? "Informe datas válidas no formato AAAA-MM-DD."
      : from > to
        ? "A data inicial deve ser anterior ou igual à final."
        : "";
  const list = error
    ? []
    : data.patients.filter((p) => {
        const d = localDate(new Date(p.arrivalAt));
        return d >= from && d <= to;
      });
  const waits = list
      .filter((p) => p.startedAt)
      .map((p) =>
        Math.max(
          0,
          (Date.parse(p.startedAt!) - Date.parse(p.arrivalAt)) / 60000,
        ),
      ),
    durations = list
      .filter((p) => p.startedAt && p.finishedAt)
      .map(
        (p) => (Date.parse(p.finishedAt!) - Date.parse(p.startedAt!)) / 60000,
      );
  const avg = (values: number[]) =>
    values.length
      ? `${Math.round(values.reduce((a, b) => a + b, 0) / values.length)} min`
      : "—";
  return (
    <View style={s.stack}>
      <Heading
        eyebrow="GESTÃO DA UNIDADE"
        title="Relatórios de atendimento"
        description="Acompanhe as entradas, os tempos de espera e os atendimentos realizados."
      >
        <Button
          label="Imprimir"
          variant="secondary"
          icon="printer"
          disabled={!!error}
          onPress={() =>
            printPatients(store, list).catch((e) => notify(e.message))
          }
        />
        <Button
          label="Exportar CSV"
          icon="download"
          disabled={!!error}
          onPress={() =>
            exportPatients(store, list).catch((e) => notify(e.message))
          }
        />
      </Heading>
      <Tabs
        value={preset}
        options={[
          { value: "today", label: "Hoje" },
          { value: "7", label: "7 dias" },
          { value: "30", label: "30 dias" },
          { value: "custom", label: "Personalizado" },
        ]}
        onChange={(value) => {
          setPreset(value);
          if (value !== "custom") {
            setFrom(fromDays(value === "today" ? 1 : Number(value)));
            setTo(localDate());
          }
        }}
      />
      {preset === "custom" && (
        <Columns>
          <Field
            label="Data inicial (AAAA-MM-DD)"
            value={from}
            onChangeText={setFrom}
            maxLength={10}
          />
          <Field
            label="Data final (AAAA-MM-DD)"
            value={to}
            onChangeText={setTo}
            maxLength={10}
          />
        </Columns>
      )}
      {!!error && <Notice error>{error}</Notice>}
      <T style={s.muted}>
        Período: {from} a {to} · por data de chegada
      </T>
      <Stats
        items={[
          {
            label: "Entradas no período",
            value: list.length,
            foot: "Pacientes recebidos",
          },
          {
            label: "Atendimentos concluídos",
            value: list.filter((p) => p.status === "finished").length,
            foot: "Dentre as entradas do período",
          },
          {
            label: "Espera média até atendimento",
            value: avg(waits),
            foot: "Somente atendimentos iniciados",
          },
          {
            label: "Duração média do atendimento",
            value: avg(durations),
            foot: "Somente atendimentos concluídos",
          },
        ]}
      />
      <Columns>
        <FlowChart
          patients={list}
          report
          period={error ? undefined : { from, to }}
        />
        <RiskChart patients={list} />
      </Columns>
      <Card
        title="Registros do período"
        subtitle={`${list.length} pacientes encontrados`}
        action={
          <Button
            variant="ghost"
            label={showAll ? "Mostrar menos" : "Ver todos os registros"}
            onPress={() => setShowAll(!showAll)}
          />
        }
      >
        {(showAll ? list : list.slice(0, 8)).map((p) => (
          <PatientRow key={p.id} patient={p} mode="compact" />
        ))}
        {!list.length && <Empty />}
      </Card>
      <Notice>
        Indicadores calculados a partir dos registros fictícios deste
        dispositivo. A exportação considera o período selecionado.
      </Notice>
    </View>
  );
}
