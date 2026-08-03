import { createHash } from "crypto";
import fs from "fs";

export async function calculateFileSha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");

  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

export async function verifyFileSha256(filePath: string, expectedSha256: string): Promise<void> {
  const actualSha256 = await calculateFileSha256(filePath);
  if (actualSha256 !== expectedSha256.toLowerCase()) {
    throw new Error(`Extension integrity check failed: expected SHA-256 ${expectedSha256}, received ${actualSha256}`);
  }
}
