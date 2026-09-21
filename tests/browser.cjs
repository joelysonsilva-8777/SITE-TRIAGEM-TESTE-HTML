const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");
async function launchBrowser() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)
    return chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      headless: true,
    });
  if (fs.existsSync(chromium.executablePath()))
    return chromium.launch({ headless: true });
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === "win32"
      ? path.join(
          process.env.LOCALAPPDATA ||
            path.join(os.homedir(), "AppData", "Local"),
          "ms-playwright",
        )
      : path.join(os.homedir(), ".cache", "ms-playwright"));
  if (fs.existsSync(cache))
    for (const folder of fs
      .readdirSync(cache)
      .filter((n) => /^chromium-\d+$/.test(n))
      .sort()
      .reverse()) {
      for (const suffix of [
        "chrome-win64/chrome.exe",
        "chrome-win/chrome.exe",
        "chrome-linux64/chrome",
        "chrome-linux/chrome",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      ]) {
        const executablePath = path.join(cache, folder, suffix);
        if (fs.existsSync(executablePath))
          return chromium.launch({ executablePath, headless: true });
      }
    }
  return chromium.launch({ headless: true });
}
module.exports = { launchBrowser };
