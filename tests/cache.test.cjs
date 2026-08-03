const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { isExtensionCacheCurrent, isVersionAtLeast } = require("../dist/cache.js");

test("compares Chrome extension versions numerically", () => {
  assert.equal(isVersionAtLeast("3.2.10", "3.2.10"), true);
  assert.equal(isVersionAtLeast("3.10", "3.2.10"), true);
  assert.equal(isVersionAtLeast("3.2.9", "3.2.10"), false);
  assert.equal(isVersionAtLeast("0.1.3.2", "0.1.3.2"), true);
});

test("invalidates stale cached extensions", async (t) => {
  const extensionFolder = await fs.mkdtemp(path.join(os.tmpdir(), "electron-extension-installer-"));
  t.after(() => fs.rm(extensionFolder, { recursive: true, force: true }));

  await fs.writeFile(path.join(extensionFolder, "manifest.json"), JSON.stringify({ version: "2.17.0" }));
  assert.equal(await isExtensionCacheCurrent(extensionFolder, "3.2.10"), false);

  await fs.writeFile(path.join(extensionFolder, "manifest.json"), JSON.stringify({ version: "3.2.10" }));
  assert.equal(await isExtensionCacheCurrent(extensionFolder, "3.2.10"), true);

  await fs.writeFile(path.join(extensionFolder, "manifest.json"), "not json");
  assert.equal(await isExtensionCacheCurrent(extensionFolder, "3.2.10"), false);
});
