import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { Dialog } from '../data/types';

interface Feedback {
  dialog: Dialog | null;
  open: (dialog: Dialog) => void;
  close: () => void;
  notify: (message: string) => void;
}
const Context = createContext<Feedback | null>(null);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const notify = (message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(''), 6000);
  };
  return (
    <Context.Provider
      value={{ dialog, open: setDialog, close: () => setDialog(null), notify }}
    >
      {children}
      <div className="rw-toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="rw-toast">
            <CheckCircle2 size={20} />
            <span>{toast}</span>
            <button
              type="button"
              aria-label="Dispensar mensagem"
              onClick={() => setToast('')}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}
export function useFeedback() {
  const context = useContext(Context);
  if (!context) throw new Error('FeedbackProvider ausente.');
  return context;
}
