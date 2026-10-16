import { Link } from 'react-router';
import { Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { useDesktop } from '../data/store';
export default function DesktopStatus() {
  const { sync } = useDesktop();
  const attention =
    sync.conflicts || sync.errors || sync.state === 'auth-error';
  return (
    <div className={`desktop-status ${attention ? 'needs-attention' : ''}`}>
      <div className="site-width">
        <span>
          <HardDrive size={15} />
          Dados salvos neste computador
        </span>
        <Link to="/sincronizacao">
          {sync.state === 'syncing' ? (
            <RefreshCw size={15} />
          ) : (
            <Cloud size={15} />
          )}
          {sync.state === 'syncing'
            ? 'Sincronizando...'
            : sync.conflicts
              ? `${sync.conflicts} conflitos para revisar`
              : sync.pending
                ? `${sync.pending} envios pendentes`
                : sync.state === 'synced'
                  ? 'Sincronizado'
                  : 'Conectar ao Firebase'}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
