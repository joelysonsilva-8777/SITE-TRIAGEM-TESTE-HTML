import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { environment } from './environment.mjs';
Object.assign(process.env, environment());
const electron = createRequire(import.meta.url)('electron');
const child = spawn(electron, ['.', ...process.argv.slice(2)], {
  env: environment(),
  stdio: 'inherit',
  windowsHide: true,
});
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
