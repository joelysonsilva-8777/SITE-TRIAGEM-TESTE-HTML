import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { Patient } from "../data/types";
import { useStore } from "../data/StoreProvider";
import { colors, s } from "../theme";
import { Button, Card, T, Tabs } from "./ui";
export function FlowChart({
  patients,
  report = false,
  period,
}: {
  patients: Patient[];
  report?: boolean;
  period?: { from: string; to: string };
}) {
  const [mode, setMode] = useState(report ? "week" : "day"),
    [details, setDetails] = useState(false);
  const times = patients.map((p) => Date.parse(p.arrivalAt));
  const start = period
      ? new Date(period.from + "T00:00:00")
      : report && times.length
        ? new Date(Math.min(...times))
        : new Date(),
    end = period
      ? new Date(period.to + "T23:59:59")
      : report && times.length
        ? new Date(Math.max(...times))
        : new Date();
  if (report) {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }
  const calendarDay = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.max(
    1,
    Math.round((calendarDay(end) - calendarDay(start)) / 86400000) + 1,
  );
  const bucketDays = Math.ceil(days / 7);
  const bucketCount = days === 1 ? 8 : Math.ceil(days / bucketDays);
  const series = Array.from(
    { length: report ? bucketCount : mode === "day" ? 8 : 7 },
    (_, i) => {
      let from: Date, to: Date;
      if (report) {
        from = new Date(start);
        to = new Date(start);
        if (days === 1) {
          from.setHours(i * 3, 0, 0, 0);
          to.setHours((i + 1) * 3, 0, 0, 0);
        } else {
          from.setDate(from.getDate() + bucketDays * i);
          to.setDate(to.getDate() + Math.min(days, bucketDays * (i + 1)));
        }
      } else if (mode === "day") {
        from = new Date();
        from.setHours(from.getHours() - 7 + i, 0, 0, 0);
        to = new Date(+from + 3600000);
      } else {
        from = new Date();
        from.setDate(from.getDate() - 6 + i);
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(to.getDate() + 1);
      }
      return {
        label:
          (report && days === 1) || (!report && mode === "day")
            ? from.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : from.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              }) +
              (report && bucketDays > 1
                ? "–" +
                  new Date(+to - 1).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })
                : ""),
        arrivals: patients.filter(
          (p) =>
            Date.parse(p.arrivalAt) >= +from && Date.parse(p.arrivalAt) < +to,
        ).length,
        finished: patients.filter(
          (p) =>
            p.finishedAt &&
            Date.parse(p.finishedAt) >= +from &&
            Date.parse(p.finishedAt) < +to,
        ).length,
      };
    },
  );
  const max =
    Math.ceil(
      Math.max(4, ...series.flatMap((p) => [p.arrivals, p.finished])) / 4,
    ) * 4;
  const x = (i: number) => 35 + (i * 510) / (series.length - 1),
    y = (n: number) => 165 - (n / max) * 140;
  return (
    <Card
      title="Entradas e atendimentos"
      subtitle="Acompanhe a movimentação da unidade."
      action={
        !report && (
          <Tabs
            value={mode}
            onChange={setMode}
            options={[
              { value: "day", label: "Hoje" },
              { value: "week", label: "7 dias" },
            ]}
          />
        )
      }
    >
      <View style={s.pad}>
        <View style={s.row}>
          <T style={[s.small, { color: colors.green }]}>━ Entradas</T>
          <T style={[s.small, { color: "#aa7017" }]}>┄ Conclusões</T>
        </View>
        <Svg
          width="100%"
          height={190}
          viewBox="0 0 580 200"
          accessibilityLabel="Entradas e conclusões. Consulte os dados abaixo."
        >
          {[0, 1, 2, 3, 4].map((n) => (
            <React.Fragment key={n}>
              <Line
                x1={35}
                x2={548}
                y1={y((n * max) / 4)}
                y2={y((n * max) / 4)}
                stroke={colors.border}
                strokeDasharray="3 4"
              />
              <SvgText
                x={25}
                y={y((n * max) / 4) + 4}
                textAnchor="end"
                fill={colors.muted}
                fontSize={10}
              >
                {(n * max) / 4}
              </SvgText>
            </React.Fragment>
          ))}
          <Polyline
            points={series.map((p, i) => `${x(i)},${y(p.finished)}`).join(" ")}
            fill="none"
            stroke="#aa7017"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <Polyline
            points={series.map((p, i) => `${x(i)},${y(p.arrivals)}`).join(" ")}
            fill="none"
            stroke={colors.green}
            strokeWidth={2.5}
          />
          {series.map((p, i) => (
            <React.Fragment key={i}>
              <Rect
                x={x(i) - 2.5}
                y={y(p.arrivals) - 2.5}
                width={5}
                height={5}
                fill={colors.green}
              />
              <SvgText
                x={x(i)}
                y={190}
                textAnchor="middle"
                fill={colors.muted}
                fontSize={10}
              >
                {p.label}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
        <View style={s.between}>
          <T style={s.small}>
            {series.reduce((n, p) => n + p.arrivals, 0)} entradas no período
          </T>
          <Button
            small
            variant="ghost"
            label={
              details
                ? "Ocultar dados do gráfico"
                : "Consultar dados do gráfico"
            }
            onPress={() => setDetails(!details)}
          />
        </View>
        {details && (
          <View style={{ gap: 8 }}>
            <T style={s.h3}>Período · Entradas · Conclusões</T>
            {series.map((p, i) => (
              <T key={i}>
                {p.label} · {p.arrivals} · {p.finished}
              </T>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}
export function RiskChart({ patients }: { patients: Patient[] }) {
  const { store } = useStore();
  const list = [
    ...store.risks,
    { id: null, label: "Não classificado", color: colors.muted },
  ].map((r) => ({
    ...r,
    count: patients.filter((p) => p.risk === r.id).length,
  }));
  const max = Math.max(1, ...list.map((r) => r.count));
  return (
    <Card
      title="Classificação de risco"
      subtitle={`${patients.length} pacientes no conjunto selecionado`}
    >
      <View style={s.pad}>
        {list.map((r) => (
          <View key={r.id || "none"} style={s.row}>
            <T style={{ width: 112, fontSize: 13 }}>{r.label}</T>
            <View style={{ flex: 1, height: 8, backgroundColor: colors.light }}>
              <View
                style={{
                  width: `${(r.count / max) * 100}%`,
                  height: 8,
                  backgroundColor: r.color,
                }}
              />
            </View>
            <T style={{ width: 24, textAlign: "right" }}>{r.count}</T>
          </View>
        ))}
        <T style={[s.small, s.muted]}>
          Classificação definida pelo profissional.
        </T>
      </View>
    </Card>
  );
}
