import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/original.css';
import './styles/app.css';
import './styles/desktop.css';
import './styles/brand.css';
import App from './App';
import { initializeStore } from './data/store';

const root = createRoot(document.getElementById('root')!);
initializeStore()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error) =>
    root.render(
      <main className="rw-loading">
        <h1>Não foi possível abrir o banco local.</h1>
        <p>{error.message}</p>
        <p>
          Os arquivos existentes foram preservados. Feche e abra o aplicativo
          para tentar novamente.
        </p>
      </main>,
    ),
  );
