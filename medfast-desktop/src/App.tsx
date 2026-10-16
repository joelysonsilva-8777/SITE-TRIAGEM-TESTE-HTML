import { Component, lazy, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import Shell from './components/Shell';
import Dialogs from './components/Dialogs';
import { FeedbackProvider } from './components/Feedback';
import { Button, Empty } from './components/UI';
import SyncPanel from './pages/SyncPanel';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));
const Triage = lazy(() => import('./pages/Triage'));
const Queue = lazy(() => import('./pages/Queue'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Team = lazy(() => import('./pages/Team'));
const Reports = lazy(() => import('./pages/Reports'));

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MedFast: falha na interface', error, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="rw-loading">
          <h1>Não foi possível abrir esta tela.</h1>
          <p>Recarregue a página para tentar novamente.</p>
          <Button onClick={() => window.location.reload()}>
            Recarregar MedFast
          </Button>
        </main>
      );
    return this.props.children;
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <FeedbackProvider>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="index.html" element={<Dashboard />} />
              <Route path="sincronizacao" element={<SyncPanel />} />
              <Route path="pacientes" element={<Patients />} />
              <Route path="triagem" element={<Triage />} />
              <Route path="fila" element={<Queue />} />
              <Route path="atendimentos" element={<Attendance />} />
              <Route path="equipe" element={<Team />} />
              <Route path="relatorios" element={<Reports />} />
              <Route
                path="*"
                element={
                  <Empty
                    title="Esta página não foi encontrada."
                    description="Volte à visão geral para continuar."
                  >
                    <Link to="/" className="btn btn-primary">
                      Voltar ao início
                    </Link>
                  </Empty>
                }
              />
            </Route>
          </Routes>
          <Dialogs />
        </FeedbackProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
