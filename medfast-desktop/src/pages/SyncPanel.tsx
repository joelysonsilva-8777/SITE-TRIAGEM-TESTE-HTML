import { useState } from 'react';
import {
  Cloud,
  Download,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Upload,
  WifiOff,
} from 'lucide-react';
import { acceptState, useDesktop } from '../data/store';
import {
  Button,
  Card,
  Input,
  Metrics,
  Notice,
  PageHeading,
} from '../components/UI';
import { dateTime } from '../lib/format';
import ConflictVersion from '../components/ConflictVersion';

const syncLabels: Record<string, string> = {
  waiting: 'Pronto para conectar',
  'signed-out': 'Aguardando login',
  syncing: 'Sincronizando',
  offline: 'Sem conexão',
  'auth-error': 'Verifique o acesso',
  error: 'Envio precisa de atenção',
  conflict: 'Conflitos para revisar',
  pending: 'Envios pendentes',
  synced: 'Tudo sincronizado',
};
export default function SyncPanel() {
  const desktop = useDesktop();
  const { sync, config, conflicts } = desktop;
  const [email, setEmail] = useState(sync.session?.email || config.adminEmail);
  const [password, setPassword] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackup, setConfirmBackup] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resolution, setResolution] = useState<{
    key: string;
    choice: 'local' | 'remote';
  } | null>(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível concluir.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="O cuidado continua, mesmo offline."
        eyebrow="SINCRONIZAÇÃO E BACKUP"
        description="Cada alteração é salva primeiro neste computador. Quando houver conexão e acesso autorizado, os envios são retomados automaticamente."
      >
        <Button
          disabled={busy || sync.state === 'syncing'}
          onClick={() =>
            void perform(async () => {
              acceptState(await window.clara.sync());
            })
          }
        >
          <RefreshCw size={17} />
          Sincronizar agora
        </Button>
      </PageHeading>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Metrics
        items={[
          {
            label: 'Armazenamento local',
            value: <HardDrive size={30} />,
            foot: 'Registros protegidos neste computador',
          },
          {
            label: 'Envios pendentes',
            value: sync.pending,
            foot: 'Preservados após fechar o aplicativo',
          },
          {
            label: 'Conflitos',
            value: sync.conflicts,
            foot: 'Versões aguardando sua revisão',
          },
          {
            label: 'Última sincronização',
            value: sync.lastSync ? dateTime(sync.lastSync) : '—',
            foot: syncLabels[sync.state] || sync.state,
          },
        ]}
      />
      {sync.message && (
        <Notice error={['error', 'auth-error'].includes(sync.state)}>
          {sync.message}
        </Notice>
      )}
      <div className="desktop-sync-grid">
        <Card
          title="Conexão com a unidade"
          subtitle={`${config.projectId} · ${config.unitId}`}
        >
          <div className="card-body">
            {sync.session ? (
              <>
                <div className="desktop-account">
                  <ShieldCheck size={28} />
                  <div>
                    <strong>{sync.session.email}</strong>
                    <p>
                      {sync.session.role === 'admin'
                        ? 'Administrador'
                        : sync.session.role === 'editor'
                          ? 'Profissional com edição'
                          : sync.session.role === 'viewer'
                            ? 'Somente consulta'
                            : 'Aguardando autorização da unidade'}
                    </p>
                  </div>
                </div>
                <Input
                  label="UID da conta no Firebase"
                  value={sync.session.uid}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <p className="field-hint">
                  A autorização é definida em units/{config.unitId}/members/
                  {sync.session.uid}. Consulte o README para a primeira
                  ativação.
                </p>
                <div className="form-actions">
                  <Button
                    variant="secondary"
                    disabled={busy || sync.state === 'syncing'}
                    onClick={() =>
                      void perform(async () => {
                        acceptState(await window.clara.logout());
                        setMessage(
                          'Sessão encerrada. Os registros e envios pendentes continuam neste computador.',
                        );
                      })
                    }
                  >
                    Sair da conta
                  </Button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void perform(async () => {
                    try {
                      acceptState(await window.clara.login(email, password));
                      setMessage(
                        'Conta conectada. A sincronização foi iniciada.',
                      );
                    } finally {
                      setPassword('');
                      acceptState(await window.clara.load());
                    }
                  });
                }}
              >
                <div className="form-grid">
                  <Input
                    full
                    label="E-mail da conta"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    full
                    label="Senha"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <Button type="submit" disabled={busy}>
                    <Cloud size={16} />
                    Entrar e conectar
                  </Button>
                </div>
                <p className="field-hint">
                  O primeiro login exige internet. Depois, a sessão é protegida
                  pelo Windows e os registros continuam disponíveis offline.
                </p>
              </form>
            )}
          </div>
        </Card>
        <Card
          title="Backup protegido por senha"
          subtitle="Uma cópia independente dos dados e envios pendentes."
        >
          <div className="card-body">
            <p className="form-intro">
              Guarde o arquivo em outro dispositivo ou local de sua confiança. A
              senha é necessária para restaurá-lo em outro computador.
            </p>
            <div className="form-grid">
              <Input
                full
                label="Senha do backup"
                type="password"
                minLength={12}
                autoComplete="new-password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                hint="Pelo menos 12 caracteres. Guarde esta senha."
              />
              <Input
                full
                label="Confirmar senha do backup"
                type="password"
                autoComplete="new-password"
                value={confirmBackup}
                onChange={(e) => setConfirmBackup(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    if (
                      backupPassword.length < 12 ||
                      backupPassword !== confirmBackup
                    )
                      throw new Error(
                        'Use pelo menos 12 caracteres e confirme a mesma senha.',
                      );
                    if (await window.clara.backup(backupPassword)) {
                      setMessage('Backup protegido salvo.');
                      setBackupPassword('');
                      setConfirmBackup('');
                    }
                  })
                }
              >
                <Download size={16} />
                Criar backup
              </Button>
            </div>
            <details className="desktop-restore">
              <summary>Restaurar em uma instalação vazia</summary>
              <p>
                Informe a senha do arquivo no campo acima. A restauração é
                permitida apenas quando não há pacientes, equipe ou envios
                locais.
              </p>
              <label className="rw-checkbox">
                <input
                  type="checkbox"
                  checked={restoreConfirmed}
                  onChange={(e) => setRestoreConfirmed(e.target.checked)}
                />
                <span>Quero recuperar um backup nesta instalação vazia.</span>
              </label>
              <Button
                variant="secondary"
                disabled={busy || !restoreConfirmed || sync.state === 'syncing'}
                onClick={() =>
                  void perform(async () => {
                    if (backupPassword.length < 12)
                      throw new Error('Informe a senha do backup.');
                    if (await window.clara.restore(backupPassword)) {
                      acceptState(await window.clara.load());
                      setMessage(
                        'Backup restaurado. Entre na conta para retomar a sincronização.',
                      );
                      setBackupPassword('');
                      setConfirmBackup('');
                    }
                  })
                }
              >
                <Upload size={16} />
                Selecionar e restaurar
              </Button>
            </details>
          </div>
        </Card>
      </div>
      <Card
        title="Conflitos entre computadores"
        subtitle="A versão local permanece intacta até você decidir qual versão utilizar."
      >
        {!conflicts.length ? (
          <div className="rw-empty">
            <ShieldCheck size={28} />
            <h3>Nenhum conflito pendente.</h3>
            <p>
              Quando houver alterações concorrentes no mesmo registro, as duas
              versões aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="card-body">
            {conflicts.map((item) => (
              <article key={item.key} className="desktop-conflict">
                <h3>
                  {String(item.local.name || item.local.hospital || item.id)}
                </h3>
                <p className="muted">
                  {{
                    patients: 'Paciente',
                    staff: 'Profissional',
                    events: 'Registro de cuidado',
                    settings: 'Unidade',
                  }[item.kind] || 'Registro'}{' '}
                  · {dateTime(item.detectedAt)} · Diferenças destacadas em
                  amarelo
                </p>
                <div className="desktop-conflict-versions">
                  <div>
                    <h4>Neste computador</h4>
                    <ConflictVersion value={item.local} other={item.remote} />
                  </div>
                  <div>
                    <h4>No Firebase</h4>
                    <ConflictVersion value={item.remote} other={item.local} />
                  </div>
                </div>
                {resolution?.key === item.key ? (
                  <Notice>
                    <p>
                      {resolution.choice === 'local'
                        ? 'A versão local será reenviada sobre a versão remota revisada.'
                        : 'O registro local passará a usar a versão do Firebase.'}{' '}
                      As duas versões ficam preservadas no histórico local de
                      resolução e nos backups.
                    </p>
                    <div className="rw-actions">
                      <Button
                        variant="secondary"
                        onClick={() => setResolution(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        disabled={busy || sync.state === 'syncing'}
                        onClick={() =>
                          void perform(async () => {
                            acceptState(
                              await window.clara.resolve(
                                item.key,
                                resolution.choice,
                              ),
                            );
                            setResolution(null);
                            setMessage(
                              'Escolha registrada. A sincronização será retomada.',
                            );
                          })
                        }
                      >
                        Confirmar escolha
                      </Button>
                    </div>
                  </Notice>
                ) : (
                  <div className="form-actions">
                    <Button
                      disabled={busy || sync.state === 'syncing'}
                      variant="secondary"
                      onClick={() =>
                        setResolution({ key: item.key, choice: 'remote' })
                      }
                    >
                      Usar versão do Firebase
                    </Button>
                    <Button
                      disabled={busy || sync.state === 'syncing'}
                      onClick={() =>
                        setResolution({ key: item.key, choice: 'local' })
                      }
                    >
                      Manter versão local
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>
      <div className="home-closing">
        <WifiOff size={23} />
        <p>
          <strong>Sem internet não significa sem registro.</strong> Pode
          continuar atendendo. Não desligue o computador enquanto uma gravação
          local estiver sendo confirmada.
        </p>
      </div>
    </>
  );
}
