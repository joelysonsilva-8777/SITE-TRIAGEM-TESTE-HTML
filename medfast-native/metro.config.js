const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Keep native exports within a modest memory budget on Windows laptops.
if (process.platform === "win32")
  config.maxWorkers = Math.min(config.maxWorkers || 2, 2);
const previous = config.resolver.blockList;
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
  ...[".tmp", ".cache", "dist", "test-results"].map(
    (directory) =>
      new RegExp(
        "^" + escape(path.resolve(__dirname, directory)) + "(?:[/\\\\]|$)",
      ),
  ),
];
module.exports = config;
