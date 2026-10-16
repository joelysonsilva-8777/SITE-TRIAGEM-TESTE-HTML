import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { createHash } from 'node:crypto';

const { extractFile } = createRequire(import.meta.url)('@electron/asar');
const archive = 'release/win-unpacked/resources/app.asar';
const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
const files = [
  ...walk('dist'),
  ...walk('electron'),
  normalize('src/data/store-core.js'),
  'firebase.config.json',
  normalize('build/icon.ico'),
];
for (const path of files) {
  assert.ok(
    extractFile(archive, path).equals(readFileSync(path)),
    `O arquivo empacotado difere do original: ${path}. Gere o pacote novamente sem editar os fontes durante a geração.`,
  );
}
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const executables = [
  `MedFast-Instalador-${version}-x64.exe`,
  `MedFast-Portatil-${version}-x64.exe`,
];
const hashes = executables.map((name) => {
  const path = join('release', name);
  assert.ok(statSync(path).size > 0, `Executável vazio: ${name}`);
  const bytes = readFileSync(path);
  assert.equal(
    bytes.subarray(0, 2).toString(),
    'MZ',
    `Executável Windows inválido: ${name}`,
  );
  return `${createHash('sha256').update(bytes).digest('hex')}  ${name}`;
});
writeFileSync('release/SHA256SUMS.txt', hashes.join('\n') + '\n');
console.log(
  `${files.length} arquivos conferidos no pacote; dois executáveis verificados. SHA256SUMS.txt gerado.`,
);
