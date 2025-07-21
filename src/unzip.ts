import fs from "fs/promises";
import path from "path";
import jszip from "jszip";

// Credits for the original function go to Rob--W
// https://github.com/Rob--W/crxviewer/blob/master/src/lib/crx-to-zip.js
function calcLength(a: number, b: number, c: number, d: number) {
  let length = 0;

  length += a << 0;
  length += b << 8;
  length += c << 16;
  length += (d << 24) >>> 0;
  return length;
}

function crxToZip(buf: Buffer) {
  // 50 4b 03 04
  // This is actually a zip file
  if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4) {
    return buf;
  }

  // 43 72 32 34 (Cr24)
  if (buf[0] !== 67 || buf[1] !== 114 || buf[2] !== 50 || buf[3] !== 52) {
    throw new Error("Invalid header: Does not start with Cr24");
  }

  // 02 00 00 00
  // or
  // 03 00 00 00
  const isV3 = buf[4] === 3;
  const isV2 = buf[4] === 2;

  if ((!isV2 && !isV3) || buf[5] || buf[6] || buf[7]) {
    throw new Error("Unexpected crx format version number.");
  }

  if (isV2) {
    const publicKeyLength = calcLength(buf[8], buf[9], buf[10], buf[11]);
    const signatureLength = calcLength(buf[12], buf[13], buf[14], buf[15]);

    // 16 = Magic number (4), CRX format version (4), lengths (2x4)
    const zipStartOffset = 16 + publicKeyLength + signatureLength;

    return buf.subarray(zipStartOffset, buf.length);
  }
  // v3 format has header size and then header
  const headerSize = calcLength(buf[8], buf[9], buf[10], buf[11]);
  const zipStartOffset = 12 + headerSize;

  return buf.subarray(zipStartOffset, buf.length);
}

async function ensureDir(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // If the directory already exists, that's fine
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

async function unzip(crxFilePath: string, destination: string) {
  const filePath = path.resolve(crxFilePath);
  const extname = path.extname(crxFilePath);
  const basename = path.basename(crxFilePath, extname);
  const dirname = path.dirname(crxFilePath);

  destination = destination || path.resolve(dirname, basename);
  const buf = await fs.readFile(filePath);
  const res = await jszip.loadAsync(crxToZip(buf));
  const { files } = res;
  const zipFileKeys = Object.keys(files);

  return Promise.all(
    zipFileKeys.map(async (filename) => {
      const isFile = !files[filename].dir;
      const fullPath = path.join(destination, filename);
      const directory = (isFile && path.dirname(fullPath)) || fullPath;
      const content = await files[filename].async("nodebuffer");

      await ensureDir(directory);
      if (isFile) {
        await fs.writeFile(fullPath, content);
      }
    }),
  );
}

export default unzip;
