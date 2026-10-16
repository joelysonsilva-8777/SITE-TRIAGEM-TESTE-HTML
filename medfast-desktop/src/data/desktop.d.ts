import type { Snapshot, Staff, Patient } from './types';
export interface Conflict {
  key: string;
  kind: string;
  id: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  remoteVersion: number;
  detectedAt: string;
}
export interface DesktopState {
  snapshot: Snapshot;
  sync: {
    pending: number;
    errors: number;
    conflicts: number;
    state: string;
    message: string;
    lastSync: string | null;
    session: {
      uid: string;
      email: string;
      role: 'admin' | 'editor' | 'viewer' | 'blocked' | null;
    } | null;
  };
  conflicts: Conflict[];
  drafts: Record<string, unknown>;
  config: { projectId: string; unitId: string; adminEmail: string };
}
declare global {
  interface Window {
    clara: {
      load(): Promise<DesktopState>;
      command(
        method: string,
        args: unknown[],
      ): Promise<{
        result: Patient | Staff | Snapshot['settings'] | unknown;
        state: DesktopState;
      }>;
      login(email: string, password: string): Promise<DesktopState>;
      logout(): Promise<DesktopState>;
      sync(): Promise<DesktopState>;
      resolve(key: string, choice: 'local' | 'remote'): Promise<DesktopState>;
      saveDraft(id: string, value: unknown): Promise<boolean>;
      backup(password: string): Promise<boolean>;
      restore(password: string): Promise<boolean>;
      onState(listener: (state: DesktopState) => void): () => void;
    };
  }
}
