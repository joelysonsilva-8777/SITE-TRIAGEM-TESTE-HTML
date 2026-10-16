import React from "react";
import { Image, View, useWindowDimensions } from "react-native";
import { useStore } from "../data/StoreProvider";
import { useApp } from "../components/AppContext";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Columns,
  Stats,
  T,
} from "../components/ui";
import { FlowChart, RiskChart } from "../components/Charts";
import { PatientRow } from "../components/PatientRow";
import { photos } from "../assets";
import { availability, queue, today, waitMinutes } from "../lib/format";
import { colors, fonts, s } from "../theme";
export function Dashboard() {
  const { data } = useStore(),
    { navigate, open } = useApp(),
    { width } = useWindowDimensions();
  const waiting = queue(data.patients),
    active = data.patients.filter((p) => p.status !== "finished");
  const pending = active.filter((p) => p.status === "triage").length,
    available = data.staff.filter((p) => p.status === "available").length;
  const greeting =
    new Date().getHours() < 12
      ? "Bom dia"
      : new Date().getHours() < 18
        ? "Boa tarde"
        : "Boa noite";
  return (
    <View style={s.stack}>
      <View
        style={[s.card, { flexDirection: width >= 800 ? "row" : "column" }]}
      >
        <View
          style={{
            flex: width >= 800 ? 0.85 : undefined,
            padding: width >= 800 ? 38 : 26,
            gap: 20,
            justifyContent: "center",
          }}
        >
          <T style={[s.eyebrow, s.muted]}>
            {greeting}, {data.settings.userName.split(" ")[0]}. Bem-vinda ao
            plantão.
          </T>
          <T
            accessibilityRole="header"
            style={{
              fontFamily: fonts.serif,
              fontSize: width < 380 ? 38 : 48,
              lineHeight: width < 380 ? 46 : 57,
              letterSpacing: -1,
              color: colors.dark,
            }}
          >
            O primeiro{"\n"}cuidado é{" "}
            <T
              style={{
                fontFamily: fonts.italic,
                fontSize: width < 380 ? 38 : 48,
                lineHeight: 57,
                color: colors.green,
              }}
            >
              ouvir.
            </T>
          </T>
          <T style={{ color: colors.muted, fontSize: 16, lineHeight: 25 }}>
            Acolha quem chegou, acompanhe a espera e mantenha a equipe por
            perto. Um paciente de cada vez.
          </T>
          <View style={s.row}>
            <Button
              variant="amber"
              label="Receber paciente"
              icon="plus"
              onPress={() => open({ kind: "new" })}
            />
            <Button
              variant="ghost"
              label="Iniciar triagem"
              icon="arrow-right"
              onPress={() => navigate("triagem")}
            />
          </View>
        </View>
        <View
          style={{
            flex: width >= 800 ? 1.15 : undefined,
            minHeight: width >= 800 ? 406 : 260,
          }}
        >
          <Image
            source={photos.conversation}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
            accessibilityLabel="Profissional de saúde conversando com um paciente durante uma consulta."
          />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 22,
              backgroundColor: "#063AA8CC",
            }}
          >
            <T
              style={{ color: "white", fontFamily: fonts.medium, fontSize: 18 }}
            >
              Escuta, respeito e atenção.
            </T>
            <T style={{ color: "white", fontSize: 13 }}>
              Desde a primeira conversa.
            </T>
          </View>
        </View>
      </View>
      <Columns>
        <Card>
          <View style={s.pad}>
            <T style={s.h3}>Acolhimento e triagem</T>
            <T style={s.muted}>
              {pending} pessoas aguardam a avaliação inicial.
            </T>
            <Button
              variant="ghost"
              label="Ver pacientes"
              icon="clipboard"
              onPress={() => navigate("triagem")}
            />
          </View>
        </Card>
        <Card>
          <View style={s.pad}>
            <T style={s.h3}>Conte com a sua equipe</T>
            <T style={s.muted}>
              {data.staff.length} profissionais no plantão · {available}{" "}
              disponíveis agora.
            </T>
            <Button
              variant="ghost"
              label="Consultar equipe"
              icon="users"
              onPress={() => navigate("equipe")}
            />
          </View>
        </Card>
      </Columns>
      <View style={[s.between, { marginTop: 12 }]}>
        <View style={{ gap: 5 }}>
          <T style={s.eyebrow}>PRONTO ATENDIMENTO</T>
          <T style={s.h2}>Como está a unidade</T>
          <T style={s.muted}>O movimento de hoje e os pacientes em cuidado.</T>
        </View>
        <Badge label="Visão do momento" />
      </View>
      <Stats
        items={[
          {
            label: "Pacientes recebidos hoje",
            value: data.patients.filter((p) => today(p.arrivalAt)).length,
            foot: "Entradas desde 00h",
            icon: "users",
          },
          {
            label: "Aguardando atendimento",
            value: waiting.length,
            foot: "Pacientes já classificados",
            icon: "clock",
          },
          {
            label: "Em atendimento",
            value: active.filter((p) => p.status === "attending").length,
            foot: "Com a equipe neste momento",
            icon: "heart",
          },
          {
            label: "Espera média na fila",
            value: `${waiting.length ? Math.round(waiting.reduce((n, p) => n + waitMinutes(p), 0) / waiting.length) : 0} min`,
            foot: "Desde a chegada",
            icon: "activity",
          },
        ]}
      />
      <Columns>
        <Card
          title="Próximos atendimentos"
          subtitle="Prioridade registrada, seguida da ordem de chegada."
          action={
            <Button
              small
              variant="ghost"
              label="Abrir fila"
              onPress={() => navigate("fila")}
            />
          }
        >
          {waiting.slice(0, 4).map((p) => (
            <PatientRow key={p.id} patient={p} mode="queue" />
          ))}
          {!waiting.length && (
            <T style={{ padding: 20 }}>Nenhum paciente aguardando.</T>
          )}
        </Card>
        <Card
          title="Gente que cuida"
          subtitle="Profissionais do seu plantão"
          action={
            <Button
              small
              variant="ghost"
              label="Ver equipe"
              onPress={() => navigate("equipe")}
            />
          }
        >
          <View style={s.pad}>
            {data.staff.slice(0, 4).map((person) => (
              <View
                key={person.id}
                style={[s.row, { flexWrap: "nowrap", paddingVertical: 8 }]}
              >
                <Avatar id={person.id} name={person.name} size={52} />
                <View style={s.flex}>
                  <T style={s.h3}>{person.name}</T>
                  <T style={[s.small, s.muted]}>
                    {person.role} · {person.department}
                  </T>
                  <T style={[s.small, { color: colors.green }]}>
                    {availability[person.status]}
                  </T>
                </View>
              </View>
            ))}
            <T style={[s.small, s.muted]}>
              {available} profissionais disponíveis · Fotos ilustrativas
            </T>
          </View>
        </Card>
      </Columns>
      <Columns>
        <FlowChart patients={data.patients} />
        <RiskChart patients={active.filter((p) => p.risk)} />
      </Columns>
      <Card>
        <View style={[s.pad, s.between]}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <T style={s.h3}>Na troca de plantão, o registro faz diferença.</T>
            <T style={s.muted}>
              Mantenha as observações atualizadas para a próxima equipe.
            </T>
          </View>
          <Button
            variant="ghost"
            label="Consultar atendimentos"
            onPress={() => navigate("atendimentos")}
          />
        </View>
      </Card>
    </View>
  );
}
