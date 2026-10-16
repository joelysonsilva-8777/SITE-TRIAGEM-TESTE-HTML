import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { environment } from './environment.mjs';
Object.assign(process.env, environment());
const server = await createServer();
await server.listen();
const child = spawn(createRequire(import.meta.url)('electron'), ['.'], {
  env: environment({ MEDFAST_DEV_URL: 'http://127.0.0.1:5183' }),
  stdio: 'inherit',
  windowsHide: true,
});
child.on('exit', async (code) => {
  await server.close();
  process.exitCode = code || 0;
});
