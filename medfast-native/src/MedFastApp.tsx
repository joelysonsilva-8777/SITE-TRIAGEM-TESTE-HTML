import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Href, Slot, usePathname, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { Brand } from "./components/Brand";
import { StoreProvider, useStore } from "./data/StoreProvider";
import { AppContext } from "./components/AppContext";
import {
  Avatar,
  Button,
  Icon,
  IconButton,
  IconName,
  Notice,
  T,
} from "./components/ui";
import { Dialogs } from "./components/Dialogs";
import { Dialog, Page } from "./data/types";
import { colors, fonts, s } from "./theme";
const pages: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Visão geral", icon: "grid" },
  { id: "pacientes", label: "Pacientes", icon: "users" },
  { id: "triagem", label: "Triagem", icon: "clipboard" },
  { id: "fila", label: "Fila de atendimento", icon: "list" },
  { id: "atendimentos", label: "Atendimentos", icon: "heart" },
  { id: "equipe", label: "Equipe", icon: "users" },
  { id: "relatorios", label: "Relatórios", icon: "bar-chart-2" },
];
function MedFast() {
  const { data, storageError, retrySave } = useStore(),
    { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const route = {
    page: pages.find((p) => "/" + p.id === pathname)?.id || "dashboard",
  };
  const [dialog, setDialog] = useState<Dialog | null>(null),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [, setMinute] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const wide = width >= 1060;
  const close = () => setDialog(null);
  const navigate = (page: Page, patientId?: string) => {
    setDialog(null);
    setMenu(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
    router.push({
      pathname: page === "dashboard" ? "/" : "/" + page,
      params: patientId ? { patient: patientId } : {},
    } as Href);
  };
  useEffect(() => {
    const interval = setInterval(() => setMinute((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (dialog) {
        close();
        return true;
      }
      if (menu) {
        setMenu(false);
        return true;
      }
      if (route.page !== "dashboard") {
        if (router.canGoBack()) router.back();
        else router.replace("/");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [dialog, menu, route.page, router]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDialog({ kind: "search" });
      }
      if (e.key === "Escape") {
        setDialog(null);
        setMenu(false);
      }
    };
    window.addEventListener("keydown", keys);
    document.documentElement.lang = "pt-BR";
    return () => {
      window.removeEventListener("keydown", keys);
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web")
      document.title = `${pages.find((p) => p.id === route.page)?.label} · MedFast`;
  }, [route.page]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [pathname]);
  return (
    <AppContext.Provider
      value={{ navigate, open: setDialog, close, notify: setToast }}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.dark }}
        edges={["top", "left", "right"]}
      >
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              backgroundColor: colors.dark,
              paddingVertical: 7,
              paddingHorizontal: width < 600 ? 18 : 40,
            }}
          >
            <View
              style={[
                s.between,
                { maxWidth: 1280, width: "100%", alignSelf: "center" },
              ]}
            >
              <T style={{ color: "#e5e9e9", fontSize: 10, letterSpacing: 1.1 }}>
                CUIDADO QUE CONECTA / MEDFAST
              </T>
              {width > 600 && (
                <T style={{ color: "#e5e9e9", fontSize: 11 }}>
                  Ambiente de demonstração
                </T>
              )}
            </View>
          </View>
          <View
            style={{
              backgroundColor: "white",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingHorizontal: width < 600 ? 16 : 40,
            }}
          >
            <View
              style={[
                s.between,
                {
                  minHeight: wide ? 104 : 84,
                  maxWidth: 1280,
                  width: "100%",
                  alignSelf: "center",
                  flexWrap: "nowrap",
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="MedFast, visão geral"
                onPress={() => navigate("dashboard")}
                style={[s.row, { gap: 10, flexWrap: "nowrap" }]}
              ><Brand compact={width < 600} /></Pressable>
              <View style={[s.row, { gap: wide ? 20 : 0, flexWrap: "nowrap" }]}>
                {wide && (
                  <>
                    <Button
                      label={data.settings.hospital}
                      variant="ghost"
                      icon="plus-square"
                      onPress={() => setDialog({ kind: "unit" })}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Meu perfil"
                      onPress={() => setDialog({ kind: "profile" })}
                      style={s.row}
                    >
                      <Avatar name={data.settings.userName} id="staff_01" />
                      <View>
                        <T style={{ fontFamily: fonts.medium }}>
                          {data.settings.userName}
                        </T>
                        <T style={[s.small, s.muted]}>Enfermagem · Plantão</T>
                      </View>
                    </Pressable>
                  </>
                )}
                <IconButton
                  icon="search"
                  label="Busca global"
                  onPress={() => setDialog({ kind: "search" })}
                />
                {width > 380 && (
                  <IconButton
                    icon="bell"
                    label="Atividade recente"
                    onPress={() => setDialog({ kind: "events" })}
                  />
                )}{" "}
                {!wide && (
                  <IconButton
                    icon={menu ? "x" : "menu"}
                    label={menu ? "Fechar menu" : "Abrir menu"}
                    onPress={() => setMenu(!menu)}
                  />
                )}
              </View>
            </View>
          </View>
          {(wide || menu) && (
            <View
              style={{
                backgroundColor: "white",
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  maxWidth: 1280,
                  width: "100%",
                  alignSelf: "center",
                  flexDirection: wide ? "row" : "column",
                  paddingHorizontal: wide ? 0 : 16,
                }}
              >
                {pages.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: p.id === route.page }}
                    aria-selected={p.id === route.page}
                    accessibilityLabel={p.label}
                    onPress={() => navigate(p.id)}
                    style={{
                      flex: wide ? 1 : undefined,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: wide ? 17 : 10,
                      minHeight: 44,
                      borderBottomWidth: 2,
                      borderBottomColor:
                        p.id === route.page ? colors.green : "transparent",
                      backgroundColor:
                        p.id === route.page ? colors.light : "transparent",
                    }}
                  >
                    <Icon
                      name={p.icon}
                      size={17}
                      color={p.id === route.page ? colors.green : colors.muted}
                    />
                    <T
                      style={{
                        fontFamily: fonts.medium,
                        fontSize: 13,
                        color:
                          p.id === route.page ? colors.green : colors.muted,
                      }}
                    >
                      {p.label}
                    </T>
                  </Pressable>
                ))}
                {!wide && (
                  <View style={[s.row, { paddingVertical: 8 }]}>
                    <Button
                      variant="ghost"
                      label="Meu perfil"
                      onPress={() => {
                        setMenu(false);
                        setDialog({ kind: "profile" });
                      }}
                    />
                    <Button
                      variant="ghost"
                      label="Unidade"
                      onPress={() => {
                        setMenu(false);
                        setDialog({ kind: "unit" });
                      }}
                    />
                    <Button
                      variant="ghost"
                      label="Ajuda"
                      onPress={() => {
                        setMenu(false);
                        setDialog({ kind: "help" });
                      }}
                    />
                  </View>
                )}
              </View>
            </View>
          )}
          <ScrollView
            ref={scroll}
            style={{ flex: 1, backgroundColor: colors.bg }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 1360,
                alignSelf: "center",
                paddingHorizontal: width < 600 ? 16 : 40,
                paddingBottom: 36,
              }}
            >
              <View style={[s.between, { paddingVertical: 20 }]}>
                <T style={[s.eyebrow, { fontSize: 10 }]}>
                  {data.settings.unit.toUpperCase()} /{" "}
                  {pages.find((p) => p.id === route.page)?.label.toUpperCase()}
                </T>
                <T style={[s.small, s.muted]}>
                  {new Date().toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </T>
              </View>
              {!!storageError && (
                <View style={{ gap: 10, marginBottom: 16 }}>
                  <Notice error>{storageError}</Notice>
                  <Button
                    variant="secondary"
                    label="Tentar salvar novamente"
                    onPress={retrySave}
                  />
                </View>
              )}
              <Slot />
            </View>
            <View
              style={{
                marginTop: "auto",
                backgroundColor: colors.white,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                padding: width < 600 ? 20 : 40,
              }}
            >
              <View
                style={[
                  s.between,
                  { maxWidth: 1280, width: "100%", alignSelf: "center" },
                ]}
              >
                <View>
                  <Brand compact />
                  <T style={s.small}>
                    Conectando cuidados, aproximando pessoas.
                  </T>
                </View>
                <Button
                  variant="ghost"
                  label="Central de ajuda"
                  icon="help-circle"
                  onPress={() => setDialog({ kind: "help" })}
                />
                <T style={[s.small, s.muted]}>
                  Demonstração interativa · Dados fictícios
                </T>
              </View>
            </View>
          </ScrollView>
          {!wide && !menu && (
            <SafeAreaView
              edges={["bottom"]}
              style={{
                backgroundColor: "white",
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row" }}>
                {pages.slice(0, 4).map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: p.id === route.page }}
                    aria-selected={p.id === route.page}
                    accessibilityLabel={`Navegar para ${p.label}`}
                    onPress={() => navigate(p.id)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 10,
                      gap: 4,
                      backgroundColor:
                        route.page === p.id ? colors.light : "white",
                    }}
                  >
                    <Icon name={p.icon} size={20} />
                    <T
                      style={{
                        fontSize: 11,
                        lineHeight: 15,
                        color: colors.green,
                      }}
                    >
                      {p.id === "fila" ? "Fila" : p.label}
                    </T>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mais páginas"
                  onPress={() => setMenu(true)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 10,
                    gap: 4,
                  }}
                >
                  <Icon name="menu" />
                  <T style={{ fontSize: 11, lineHeight: 15 }}>Mais</T>
                </Pressable>
              </View>
            </SafeAreaView>
          )}
          {!!toast && (
            <Pressable
              onPress={() => setToast("")}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{
                position: "absolute",
                bottom: wide ? 20 : 90,
                right: 16,
                left: width < 600 ? 16 : undefined,
                maxWidth: 520,
                padding: 16,
                backgroundColor: colors.dark,
                borderRadius: 2,
              }}
            >
              <T style={{ color: "white" }}>{toast}</T>
            </Pressable>
          )}
          {dialog && (
            <Dialogs
              key={dialog.kind + ("id" in dialog ? dialog.id || "" : "")}
              dialog={dialog}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppContext.Provider>
  );
}
export default function MedFastApp() {
  const [loaded, error] = useFonts({
    Poppins_400Regular: require("../assets/fonts/Poppins-Regular.ttf"),
    Poppins_500Medium: require("../assets/fonts/Poppins-Medium.ttf"),
    Poppins_600SemiBold: require("../assets/fonts/Poppins-SemiBold.ttf"),
    Poppins_700Bold: require("../assets/fonts/Poppins-Bold.ttf"),
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.green} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <MedFast />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
