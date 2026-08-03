const assert = require("node:assert/strict");
const test = require("node:test");

const { getExtensionDownloadUrl } = require("../dist/download-url.js");
const { REDUX_DEVTOOLS } = require("../dist/extensions.js");

test("downloads Redux DevTools from the Chrome Web Store", () => {
  const url = getExtensionDownloadUrl(REDUX_DEVTOOLS.id, "138.0.0.0");

  assert.match(url, /^https:\/\/clients2\.google\.com\/service\/update2\/crx\?/u);
  assert.doesNotMatch(url, /\/overrides\//u);
  assert.equal(REDUX_DEVTOOLS.version, "3.2.10");
});

test("keeps compatibility overrides for unsupported extensions", () => {
  const reactDevToolsID = "fmkadmapgofadopljbjfkapdkoienihi";

  assert.equal(
    getExtensionDownloadUrl(reactDevToolsID, "138.0.0.0"),
    `https://github.com/jonluca/electron-extension-installer/raw/main/overrides/${reactDevToolsID}.crx`,
  );
});
