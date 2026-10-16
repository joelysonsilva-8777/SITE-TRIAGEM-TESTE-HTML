import { createContext, useContext } from "react";
import { Dialog, Page } from "../data/types";
export const AppContext = createContext<{
  navigate: (page: Page, patientId?: string) => void;
  open: (dialog: Dialog) => void;
  close: () => void;
  notify: (message: string) => void;
} | null>(null);
export function useApp() {
  const app = useContext(AppContext);
  if (!app) throw new Error("AppContext ausente");
  return app;
}
