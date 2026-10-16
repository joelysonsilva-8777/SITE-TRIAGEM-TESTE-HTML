import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
export function environment(extra = {}) {
  const temp = resolve('.tmp');
  mkdirSync(temp, { recursive: true });
  const env = {
    ...process.env,
    TEMP: temp,
    TMP: temp,
    TMPDIR: temp,
    ELECTRON_CACHE: resolve('.cache/electron'),
    electron_config_cache: resolve('.cache/electron'),
    ELECTRON_BUILDER_CACHE: resolve('.cache/builder'),
    FIREBASE_EMULATORS_PATH: resolve('.cache/firebase-emulators'),
    ...extra,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}
