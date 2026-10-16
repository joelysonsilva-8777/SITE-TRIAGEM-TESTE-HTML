import React, { useState } from "react";
import { Image, View, useWindowDimensions } from "react-native";
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
import { staffPhotos } from "../assets";
import { availability, fold } from "../lib/format";
import { Staff } from "../data/types";
import { s } from "../theme";
export function Team() {
  const { data, store } = useStore(),
    { open, notify } = useApp(),
    { width } = useWindowDimensions();
  const [query, setQuery] = useState(""),
    [department, setDepartment] = useState(""),
    [status, setStatus] = useState("");
  const list = data.staff.filter(
    (p) =>
      (!department || p.department === department) &&
      (!status || p.status === status) &&
      fold(p.name + " " + p.role + " " + p.department).includes(fold(query)),
  );
  return (
    <View style={s.stack}>
      <Heading
        eyebrow="EQUIPE ASSISTENCIAL"
        title="Equipe do plantão"
        description="Encontre quem está cuidando de cada setor e organize o próximo atendimento."
      >
        <Button
          variant="secondary"
          icon="calendar"
          label="Consultar escala"
          onPress={() => open({ kind: "shifts" })}
        />
      </Heading>
      <Stats
        items={[
          {
            label: "Profissionais",
            value: data.staff.length,
            foot: "Equipe cadastrada",
          },
          ...Object.entries(availability).map(([key, label]) => ({
            label,
            value: data.staff.filter((p) => p.status === key).length,
            foot:
              key === "available"
                ? "Para receber pacientes"
                : key === "busy"
                  ? "Cuidando de pacientes"
                  : "Indisponíveis no momento",
          })),
        ]}
      />
      <Field
        label="Buscar profissional"
        placeholder="Nome, função ou setor"
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.row}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Select
            label="Setor"
            value={department}
            onChange={setDepartment}
            options={[
              { value: "", label: "Todos os setores" },
              ...Array.from(new Set(data.staff.map((p) => p.department))).map(
                (d) => ({ value: d, label: d }),
              ),
            ]}
          />
        </View>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Select
            label="Disponibilidade"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Todas as disponibilidades" },
              ...Object.entries(availability).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
        {list.map((person) => (
          <Card
            key={person.id}
            style={{
              flexBasis: width > 1150 ? "23%" : width > 680 ? "47%" : "100%",
              flexGrow: 1,
            }}
          >
            <Image
              source={staffPhotos[person.id]}
              style={{ width: "100%", height: 220 }}
              resizeMode="cover"
              accessibilityLabel={`Foto ilustrativa de ${person.name}`}
            />
            <View style={s.pad}>
              <T style={s.eyebrow}>{person.department.toUpperCase()}</T>
              <T style={s.h2}>{person.name}</T>
              <T style={s.muted}>{person.role}</T>
              <T>Plantão {person.shift}</T>
              <T style={s.small}>
                {
                  data.patients.filter(
                    (p) =>
                      p.professional === person.id && p.status !== "finished",
                  ).length
                }{" "}
                pacientes vinculados
              </T>
              <Button
                label="Ver perfil e pacientes"
                variant="ghost"
                icon="arrow-right"
                onPress={() => open({ kind: "staff", id: person.id })}
              />
              <Select
                label={`Disponibilidade de ${person.name}`}
                value={person.status}
                options={Object.entries(availability).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(value) => {
                  store.updateStaff(person.id, {
                    status: value as Staff["status"],
                  });
                  notify("Disponibilidade atualizada.");
                }}
              />
            </View>
          </Card>
        ))}
      </View>
      {!list.length && <Empty title="Nenhum profissional encontrado" />}
      <Notice>
        Ao iniciar uma pausa ou retornar ao plantão, atualize a disponibilidade.
        Equipe fictícia · fotografias ilustrativas.
      </Notice>
    </View>
  );
}
