const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const pages = [
  "index.html",
  "pacientes.html",
  "triagem.html",
  "fila.html",
  "atendimentos.html",
  "equipe.html",
  "relatorios.html",
];

// A lista explícita evita publicar o servidor, testes e arquivos de configuração.
for (const entry of [...pages, "assets"]) {
  if (!fs.existsSync(path.join(root, entry))) {
    throw new Error("Arquivo necessário para o deploy ausente: " + entry);
  }
}

// O destino é sempre a pasta dist deste projeto, independentemente do cwd.
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const page of pages) {
  fs.copyFileSync(path.join(root, page), path.join(output, page));
}
fs.cpSync(path.join(root, "assets"), path.join(output, "assets"), {
  recursive: true,
});

console.log("Build concluído: 7 páginas e assets copiados para dist/.");
