import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Patient } from "../data/types";
import { useStore } from "../data/StoreProvider";
import { useApp } from "./AppContext";
import { Avatar, Badge, Button, T } from "./ui";
import { age, duration, waitMinutes, dateTime } from "../lib/format";
import { colors, fonts, s } from "../theme";
export function RiskBadge({ risk }: { risk: Patient["risk"] }) {
  const { store } = useStore();
  const r = store.risk(risk);
  return (
    <Badge
      label={r?.label || "Não classificado"}
      color={r?.color || colors.muted}
    />
  );
}
export function PatientRow({
  patient: p,
  mode = "full",
}: {
  patient: Patient;
  mode?: "full" | "queue" | "care" | "triage" | "compact";
}) {
  const { store } = useStore();
  const { open, navigate } = useApp();
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: width > 680 ? "row" : "column",
          gap: 14,
          alignItems: width > 680 ? "center" : "stretch",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver ficha de ${p.name}`}
          onPress={() => open({ kind: "detail", id: p.id })}
          style={[s.row, { flex: 1, flexWrap: "nowrap" }]}
        >
          <Avatar name={p.name} />
          <View style={s.flex}>
            <T style={{ fontFamily: fonts.medium, fontSize: 17 }}>{p.name}</T>
            <T style={[s.small, s.muted]}>
              {p.code} · {age(p.birthDate)}
            </T>
          </View>
        </Pressable>
        <View style={{ gap: 7, flex: width > 680 ? 1 : undefined }}>
          <RiskBadge risk={p.risk} />
          <T style={[s.small, s.muted]}>{store.statuses[p.status]}</T>
        </View>
        <T style={[s.small, s.muted]}>
          {p.status === "waiting" || p.status === "triage"
            ? `${duration(waitMinutes(p))} de espera`
            : dateTime(p.startedAt || p.arrivalAt)}
        </T>
      </View>
      {mode === "care" && (
        <T style={[s.small, s.muted]}>
          {store.staff().find((s) => s.id === p.professional)?.name ||
            "Profissional não atribuído"}{" "}
          · {p.room || "Local não definido"}
        </T>
      )}
      {mode !== "compact" && (
        <View style={s.row}>
          {p.status === "triage" && (
            <Button
              small
              label="Triar"
              icon="arrow-right"
              onPress={() => navigate("triagem", p.id)}
            />
          )}
          {p.status === "waiting" && (
            <Button
              small
              label="Chamar paciente"
              icon="arrow-right"
              onPress={() => open({ kind: "call", id: p.id })}
            />
          )}
          {mode === "full" && (
            <Button
              small
              label="Editar cadastro"
              variant="ghost"
              icon="edit-2"
              onPress={() => open({ kind: "edit", id: p.id })}
            />
          )}
          {mode === "care" && p.status === "attending" && (
            <>
              <Button
                small
                label="Registrar evolução"
                variant="secondary"
                onPress={() => open({ kind: "evolution", id: p.id })}
              />
              <Button
                small
                label="Profissional e local"
                variant="ghost"
                onPress={() => open({ kind: "assign", id: p.id })}
              />
              <Button
                small
                label="Concluir"
                onPress={() => open({ kind: "finish", id: p.id })}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}
