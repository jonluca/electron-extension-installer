const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { getCachedExtensionVersion } = require("../dist/cache.js");
const { getExtensionDownload, getExtensionDownloadUrl, OVERRIDE_REVISION } = require("../dist/download-url.js");
const {
  ANGULAR_DEVTOOLS,
  APOLLO_DEVELOPER_TOOLS,
  BACKBONE_DEBUGGER,
  EMBER_INSPECTOR,
  JQUERY_DEBUGGER,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
  VUEJS_DEVTOOLS,
} = require("../dist/extensions.js");
const { verifyFileSha256 } = require("../dist/integrity.js");
const unzip = require("../dist/unzip.js").default;

const overrideExtensions = [
  ANGULAR_DEVTOOLS,
  APOLLO_DEVELOPER_TOOLS,
  BACKBONE_DEBUGGER,
  EMBER_INSPECTOR,
  JQUERY_DEBUGGER,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
  VUEJS_DEVTOOLS,
];

test("downloads Redux DevTools from the Chrome Web Store", () => {
  const url = getExtensionDownloadUrl(REDUX_DEVTOOLS.id, "138.0.0.0");

  assert.match(url, /^https:\/\/clients2\.google\.com\/service\/update2\/crx\?/u);
  assert.doesNotMatch(url, /\/overrides\//u);
  assert.equal(REDUX_DEVTOOLS.version, "3.2.10");
});

test("pins and verifies compatibility overrides for unsupported extensions", async () => {
  for (const extension of overrideExtensions) {
    const download = getExtensionDownload(extension.id, "138.0.0.0");
    assert.equal(
      download.url,
      `https://raw.githubusercontent.com/jonluca/electron-extension-installer/${OVERRIDE_REVISION}/overrides/${extension.id}.crx`,
    );
    assert.match(download.sha256, /^[a-f0-9]{64}$/u);
    await verifyFileSha256(path.resolve("overrides", `${extension.id}.crx`), download.sha256);
  }
});

test("keeps override metadata aligned with the pinned manifests", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "electron-extension-overrides-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  for (const extension of overrideExtensions) {
    const extensionFolder = path.join(directory, extension.id);
    await unzip(path.resolve("overrides", `${extension.id}.crx`), extensionFolder);
    assert.equal(await getCachedExtensionVersion(extensionFolder), extension.version);
  }
});
