import { useSyncExternalStore } from 'react';
import { createStore } from './store-core.js';

export const STORAGE_KEY = 'clara:web:store:v1';
const listeners = new Set<() => void>();
let ready = false;
const storage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
};
export const store = createStore(storage, () => {
  if (!ready) return;
  snapshot = store.get();
  listeners.forEach((listener) => listener());
});
let snapshot = store.get();
ready = true;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useStore = () => useSyncExternalStore(subscribe, () => snapshot);

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    try {
      store.sync(event.newValue);
    } catch {
      /* Ignore malformed external data. */
    }
  }
});

export function downloadCSV(
  patients = store.patients(),
  filename = 'medfast-pacientes.csv',
) {
  const url = URL.createObjectURL(
    new Blob([store.exportCSV(patients)], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
