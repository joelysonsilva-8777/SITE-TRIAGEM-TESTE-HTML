import Brand from './Brand';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import {
  Activity,
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Hospital,
  LayoutGrid,
  ListOrdered,
  Menu,
  Search,
  Stethoscope,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { store, useStore } from '../data/store';
import { useFeedback } from './Feedback';
import { IconButton, Loading, Notice } from './UI';
import { useNow } from '../lib/useNow';
import DesktopStatus from './DesktopStatus';

const navigation = [
  { path: '/', label: 'Visão geral', icon: LayoutGrid },
  { path: '/pacientes', label: 'Pacientes', icon: Users },
  { path: '/triagem', label: 'Triagem', icon: ClipboardList },
  { path: '/fila', label: 'Fila de atendimento', icon: ListOrdered },
  { path: '/atendimentos', label: 'Atendimentos', icon: Stethoscope },
  { path: '/equipe', label: 'Equipe', icon: Users },
  { path: '/relatorios', label: 'Relatórios', icon: ChartNoAxesCombined },
];
export default function Shell() {
  const { settings, patients } = useStore();
  const now = useNow();
  const { open } = useFeedback();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const main = useRef<HTMLElement>(null);
  const initial = useRef(true);
  const label =
    navigation.find((n) => n.path === pathname)?.label ||
    (pathname === '/sincronizacao'
      ? 'Sincronização e backup'
      : pathname === '/index.html'
        ? 'Visão geral'
        : 'Página não encontrada');
  useEffect(() => {
    document.title = `${label} · MedFast`;
    if (!initial.current) {
      main.current?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    initial.current = false;
  }, [pathname, label]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open({ kind: 'search' });
      }
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [open]);
  return (
    <div className={menu ? 'app-shell menu-open' : 'app-shell'}>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="utility-bar">
          <div className="site-width utility-inner">
            <span>
              CUIDADO QUE ACOLHE<span className="utility-slash">/</span>
              {settings.hospital}
            </span>
            <span className="utility-demo">
              Aplicativo Windows · Armazenamento local
            </span>
          </div>
        </div>
        <div className="site-width hospital-masthead">
          <Link to="/" className="brand" aria-label="MedFast — início"><Brand /></Link>
          <div className="masthead-details">
            <button
              className="hospital-button"
              onClick={() => open({ kind: 'unit' })}
            >
              <span className="masthead-icon">
                <Hospital size={29} />
              </span>
              <span>
                <small>SUA UNIDADE</small>
                <strong>{settings.hospital}</strong>
                <span>{settings.unit}</span>
              </span>
              <ChevronDown size={15} />
            </button>
            <span className="masthead-divider" />
            <button
              className="profile-button"
              onClick={() => open({ kind: 'profile' })}
            >
              <span className="profile-symbol">
                <UserRound size={29} />
              </span>
              <span>
                <small>BEM-VINDA AO MEDFAST</small>
                <strong>{settings.userName}</strong>
                <span>Perfil deste computador</span>
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
          <button
            className="mobile-menu icon-btn"
            aria-label={menu ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menu}
            aria-controls="primary-nav"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        <div className="navigation-band">
          <div className="site-width navigation-inner">
            <span className="mobile-page-label">{label}</span>
            <nav
              className="primary-navigation"
              id="primary-nav"
              aria-label="Navegação principal"
            >
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setMenu(false)}
                >
                  <item.icon size={17} />
                  {item.label}
                  {item.path === '/fila' && (
                    <span className="nav-count">
                      {patients.filter((p) => p.status === 'waiting').length}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="navigation-tools">
              <button
                className="global-search-trigger"
                onClick={() => open({ kind: 'search' })}
              >
                <Search size={18} />
                <span>Buscar</span>
                <kbd>Ctrl K</kbd>
              </button>
              <IconButton
                label="Atividades recentes"
                onClick={() => open({ kind: 'events' })}
              >
                <Bell size={19} />
              </IconButton>
            </div>
          </div>
        </div>
      </header>
      {menu && (
        <button
          className="mobile-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMenu(false)}
          tabIndex={-1}
        />
      )}
      <DesktopStatus />
      <div className="workspace">
        <div className="site-width page-context">
          <div>
            <Link to="/">MedFast</Link>
            <ChevronRight size={12} />
            <strong>{label}</strong>
          </div>
          <time dateTime={now.toISOString()}>
            {now.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </time>
        </div>
        <main id="main-content" ref={main} tabIndex={-1}>
          {!store.storageAvailable && (
            <Notice error>{store.storageError}</Notice>
          )}
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <footer className="hospital-footer">
        <div className="site-width footer-main">
          <div className="footer-brand"><Brand /></div>
          <p>
            Cuidar começa no acolhimento.
            <br />E continua em cada encontro.
          </p>
          <div className="footer-help">
            <span>Estamos por perto</span>
            <button onClick={() => open({ kind: 'help' })}>
              Precisa de ajuda? <ArrowRight size={17} />
            </button>
          </div>
        </div>
        <div className="site-width footer-bottom">
          <span>© {now.getFullYear()} MedFast · Acolhimento e atendimento</span>
          <span>
            <Activity size={12} /> Continuidade do cuidado, online e offline
          </span>
        </div>
      </footer>
    </div>
  );
}
