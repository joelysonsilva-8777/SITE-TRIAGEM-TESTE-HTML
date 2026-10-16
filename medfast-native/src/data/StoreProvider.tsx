import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { createStore, Store } from "./store-core";
import { createPersistence } from "./persistence";
import { Snapshot } from "./types";
import { Button, T } from "../components/ui";
import { colors } from "../theme";

const KEY = "clara:store:v1";
const Context = createContext<{
  store: Store;
  data: Snapshot;
  storageError: string;
  retrySave: () => void;
} | null>(null);
export function StoreProvider({ children }: React.PropsWithChildren) {
  const [store, setStore] = useState<Store | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [storageError, setStorageError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const persistence = useRef<ReturnType<typeof createPersistence> | null>(null);
  useEffect(() => {
    let alive = true;
    const writer = createPersistence(
      AsyncStorage,
      () =>
        alive &&
        setStorageError(
          "Não foi possível salvar no dispositivo. Suas alterações estão disponíveis nesta sessão.",
        ),
      () => alive && setStorageError(""),
    );
    persistence.current = writer;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        let current: Store | undefined;
        const instance = createStore(
          {
            getItem: () => raw,
            setItem: (key, value) => {
              raw = value;
              void writer.write(key, value);
            },
          },
          () => {
            if (alive && current) setData(current.get());
          },
        );
        current = instance;
        setData(instance.get());
        setStore(instance);
      })
      .catch(
        () =>
          alive &&
          setLoadError(
            "Não foi possível abrir os dados salvos. Tente novamente.",
          ),
      );
    return () => {
      alive = false;
    };
  }, [attempt]);
  if (!store || !data)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          gap: 20,
          backgroundColor: colors.bg,
        }}
      >
        {loadError ? (
          <>
            <T>{loadError}</T>
            <Button
              label="Tentar novamente"
              onPress={() => {
                setLoadError("");
                setAttempt((n) => n + 1);
              }}
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.green} />
            <T>Preparando o plantão…</T>
          </>
        )}
      </View>
    );
  const retrySave = () => {
    void persistence.current?.write(
      KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        data: store.get(),
      }),
    );
  };
  return (
    <Context.Provider value={{ store, data, storageError, retrySave }}>
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("StoreProvider ausente");
  return value;
}
