import { build, Platform } from 'electron-builder';
import { environment } from './environment.mjs';
Object.assign(process.env, environment());
await build({
  targets: Platform.WINDOWS.createTarget(),
  config: 'electron-builder.json',
  publish: 'never',
});
