// Metro and Hermes can create large temporary files. Keep them on this drive.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const temp = path.resolve(__dirname, "../.tmp");
fs.mkdirSync(temp, { recursive: true });
const cli = path.join(
  path.dirname(require.resolve("expo/package.json")),
  "bin/cli",
);
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, ".."),
  env: { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp },
  stdio: "inherit",
  windowsHide: true,
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
