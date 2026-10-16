import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  session,
  safeStorage,
  Menu,
} from 'electron';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  dirname,
  extname,
  join,
  resolve,
  relative,
  isAbsolute,
} from 'node:path';
import { LocalDatabase, encryptBackup, decryptBackup } from './database.mjs';
import { FirebaseClient } from './firebase-client.mjs';
import { SyncEngine } from './sync-engine.mjs';
import { AppService } from './service.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testing = !app.isPackaged && process.env.MEDFAST_TEST_MODE === '1';
if (process.env.MEDFAST_USER_DATA)
  app.setPath('userData', resolve(process.env.MEDFAST_USER_DATA));
else app.setPath('userData', join(app.getPath('appData'), 'Clara'));
app.setAppUserModelId('br.com.clara.desktop');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'clara',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
const locked = app.requestSingleInstanceLock();
let window, database, cloud, sync, service;
if (!locked) app.quit();
else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(start)
    .catch((error) => {
      dialog.showErrorBox('Não foi possível iniciar o MedFast', error.message);
      app.quit();
    });
}
function safeHandler(name, handler) {
  ipcMain.handle(name, async (event, ...args) => {
    try {
      const origin = event.senderFrame?.url || '';
      const expected =
        !app.isPackaged && process.env.MEDFAST_DEV_URL
          ? process.env.MEDFAST_DEV_URL
          : 'clara://app';
      const source = new URL(origin),
        allowed = new URL(expected);
      if (
        event.sender !== window?.webContents ||
        event.senderFrame !== event.sender.mainFrame ||
        source.protocol !== allowed.protocol ||
        source.host !== allowed.host
      )
        throw new Error('Origem não autorizada.');
      return { ok: true, value: await handler(...args) };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir a operação.',
      };
    }
  });
}
async function start() {
  if (!safeStorage.isEncryptionAvailable())
    throw new Error(
      'A proteção de dados do Windows não está disponível. Não será criado um banco sem proteção.',
    );
  const codec = {
    encrypt: (value) => safeStorage.encryptString(value).toString('base64'),
    decrypt: (value) => safeStorage.decryptString(Buffer.from(value, 'base64')),
  };
  database = new LocalDatabase(
    join(app.getPath('userData'), 'data', 'clara.sqlite'),
    codec,
  );
  let config = JSON.parse(
    readFileSync(join(root, 'firebase.config.json'), 'utf8'),
  );
  let emulator = null;
  if (testing && process.env.MEDFAST_EMULATORS === '1') {
    config = { ...config, projectId: 'demo-medfast-desktop', apiKey: 'demo-key' };
    emulator = { firestore: '127.0.0.1:8183', auth: '127.0.0.1:9193' };
  }
  cloud = new FirebaseClient(config, database, { emulator });
  sync = new SyncEngine(database, cloud, () => service?.notify());
  service = new AppService(database, cloud, sync, (state) => {
    if (window && !window.isDestroyed())
      window.webContents.send('clara:state', state);
  });
  safeHandler('clara:load', () => service.state());
  safeHandler('clara:command', (method, args) => service.command(method, args));
  safeHandler('clara:login', async (email, password) => {
    if (sync.running) throw new Error('Aguarde a sincronização atual.');
    try {
      await cloud.login(email, password);
    } finally {
      service.notify();
    }
    void sync.run(true);
    return service.state();
  });
  safeHandler('clara:logout', () => {
    if (sync.running)
      throw new Error('Aguarde a sincronização atual antes de sair.');
    cloud.logout();
    service.notify();
    return service.state();
  });
  safeHandler('clara:sync', async () => {
    await sync.run(true);
    return service.state();
  });
  safeHandler('clara:resolve', (key, choice) => {
    service.assertEditor();
    if (sync.running) throw new Error('Aguarde a sincronização atual.');
    database.resolve(key, choice);
    service.notify();
    void sync.run(true);
    return service.state();
  });
  safeHandler('clara:draft', (id, value) => {
    service.assertEditor();
    database.saveDraft(id, value);
    return true;
  });
  safeHandler('clara:backup', async (password) => {
    const content = encryptBackup(database.exportState(), password);
    const result = await dialog.showSaveDialog(window, {
      title: 'Salvar backup protegido',
      defaultPath: `MedFast-${new Date().toISOString().slice(0, 10)}.medfast-backup`,
      filters: [{ name: 'Backup MedFast', extensions: ['medfast-backup'] }],
    });
    if (result.canceled) return false;
    writeFileSync(result.filePath, content, { encoding: 'utf8', mode: 0o600 });
    return true;
  });
  safeHandler('clara:restore', async (password) => {
    service.assertEditor();
    if (sync.running) throw new Error('Aguarde a sincronização atual.');
    // Restore only into an empty local workspace; never destroy unuploaded care records.
    if (
      database.snapshot().patients.length ||
      database.snapshot().staff.length ||
      database.status().pending
    )
      throw new Error(
        'Restaure em uma instalação vazia. Este computador já contém registros que precisam ser preservados.',
      );
    const result = await dialog.showOpenDialog(window, {
      title: 'Restaurar backup MedFast',
      properties: ['openFile'],
      filters: [{ name: 'Backup MedFast', extensions: ['medfast-backup', 'clara-backup'] }],
    });
    if (result.canceled) return false;
    const content = readFileSync(result.filePaths[0], 'utf8');
    if (content.length > 200000000)
      throw new Error('Backup acima do limite desta versão.');
    const restored = decryptBackup(content, password);
    const bound = restored.meta?.binding;
    if (
      bound &&
      (bound.projectId !== config.projectId || bound.unitId !== config.unitId)
    )
      throw new Error('O backup pertence a outro projeto ou unidade.');
    database.restoreState(restored);
    cloud.logout();
    service.notify();
    return true;
  });
  const dist = join(root, 'dist');
  protocol.handle('clara', (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'app' || request.method !== 'GET')
      return new Response('Acesso negado', { status: 403 });
    let path;
    try {
      path = resolve(dist, '.' + decodeURIComponent(url.pathname));
    } catch {
      return new Response('URL inválida', { status: 400 });
    }
    const rel = relative(dist, path);
    if (rel.startsWith('..') || isAbsolute(rel))
      return new Response('Acesso negado', { status: 403 });
    if (!existsSync(path) || !extname(path))
      path = extname(path) ? null : join(dist, 'index.html');
    if (!path) return new Response('Não encontrado', { status: 404 });
    const type =
      {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      }[extname(path)] || 'application/octet-stream';
    return new Response(readFileSync(path), {
      headers: {
        'Content-Type': type,
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      },
    });
  });
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 800,
    minHeight: 600,
    title: 'MedFast',
    backgroundColor: '#F3F6F9',
    show: false,
    icon: join(root, 'build', 'icon.ico'),
    webPreferences: {
      preload: join(root, 'electron', 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => {
    if (
      !target.startsWith('clara://app/') &&
      !(
        process.env.MEDFAST_DEV_URL &&
        !app.isPackaged &&
        target.startsWith(process.env.MEDFAST_DEV_URL)
      )
    )
      event.preventDefault();
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'MedFast',
        submenu: [
          { label: 'Sincronizar agora', click: () => void sync.run(true) },
          {
            label: 'Imprimir',
            accelerator: 'CmdOrCtrl+P',
            click: () => window.webContents.print({ printBackground: true }),
          },
          { type: 'separator' },
          { role: 'quit', label: 'Sair' },
        ],
      },
      {
        label: 'Editar',
        submenu: [
          { role: 'undo', label: 'Desfazer' },
          { role: 'redo', label: 'Refazer' },
          { type: 'separator' },
          { role: 'cut', label: 'Recortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Colar' },
          { role: 'selectAll', label: 'Selecionar tudo' },
        ],
      },
      {
        label: 'Visualizar',
        submenu: [
          { role: 'reload', label: 'Recarregar' },
          { role: 'resetZoom', label: 'Tamanho original' },
          { role: 'zoomIn', label: 'Ampliar' },
          { role: 'zoomOut', label: 'Reduzir' },
          { role: 'togglefullscreen', label: 'Tela cheia' },
        ],
      },
    ]),
  );
  window.once('ready-to-show', () => {
    if (!testing && process.env.MEDFAST_HIDDEN !== '1') window.show();
  });
  await window.loadURL(
    !app.isPackaged && process.env.MEDFAST_DEV_URL
      ? process.env.MEDFAST_DEV_URL
      : 'clara://app/index.html',
  );
  sync.start();
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  sync?.stop();
});
app.on('will-quit', () => {
  try {
    database?.close();
  } catch {
    /* Already closed. */
  }
});
