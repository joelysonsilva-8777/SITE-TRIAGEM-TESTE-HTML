import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { environment } from './environment.mjs';
const cli = resolve('node_modules/firebase-tools/lib/bin/firebase.js');
const env = environment();
delete env.DEBUG;
const child = spawn(
  process.execPath,
  [
    cli,
    'emulators:exec',
    '--only',
    'firestore,auth',
    '--project',
    'demo-medfast-desktop',
    'node --test tests/firebase.integration.mjs',
  ],
  { env, stdio: 'inherit', windowsHide: true },
);
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
