const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium
    .launch({ headless: true })
    .catch(() => chromium.launch({ headless: true, channel: "msedge" }));
  try {
    const page = await browser.newPage({
      viewport: { width: 1024, height: 1024 },
    });
    const svg = fs.readFileSync(
      path.join(__dirname, "../assets/MedFast.svg"),
      "utf8",
    );
    await page.setContent(
      `<style>body{margin:0}svg{width:100vw;height:100vh;display:block}</style>${svg}`,
    );
    await page.screenshot({ path: path.join(__dirname, "../assets/icon.png") });
    await page.setViewportSize({ width: 64, height: 64 });
    await page.screenshot({
      path: path.join(__dirname, "../assets/favicon.png"),
    });
  } finally {
    await browser.close();
  }
})();
