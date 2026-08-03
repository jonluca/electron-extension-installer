const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { calculateFileSha256, verifyFileSha256 } = require("../dist/integrity.js");

test("rejects extension files that do not match their pinned checksum", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "electron-extension-integrity-"));
  const filePath = path.join(directory, "extension.crx");
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  await fs.writeFile(filePath, "tampered extension");
  const actualSha256 = await calculateFileSha256(filePath);

  await assert.rejects(
    verifyFileSha256(filePath, "0".repeat(64)),
    new RegExp(`Extension integrity check failed:.*${actualSha256}`, "u"),
  );
});
