import fs from "fs/promises";
import path from "path";

interface ExtensionManifest {
  version?: unknown;
}

function parseExtensionVersion(version: string): number[] | undefined {
  const parts = version.split(".");
  if (parts.length === 0 || parts.length > 4) {
    return undefined;
  }

  const parsed = parts.map((part) => {
    if (!/^(0|[1-9]\d*)$/u.test(part)) {
      return undefined;
    }

    const value = Number(part);
    return Number.isInteger(value) && value <= 65_535 ? value : undefined;
  });

  if (parsed.some((part) => part === undefined)) {
    return undefined;
  }

  return [...(parsed as number[]), 0, 0, 0, 0].slice(0, 4);
}

export function isVersionAtLeast(version: string, minimumVersion: string): boolean {
  const parsedVersion = parseExtensionVersion(version);
  const parsedMinimum = parseExtensionVersion(minimumVersion);

  if (!parsedVersion || !parsedMinimum) {
    return version === minimumVersion;
  }

  for (let index = 0; index < parsedVersion.length; index += 1) {
    if (parsedVersion[index] !== parsedMinimum[index]) {
      return parsedVersion[index] > parsedMinimum[index];
    }
  }

  return true;
}

export async function getCachedExtensionVersion(extensionFolder: string): Promise<string | undefined> {
  try {
    const manifest = JSON.parse(
      await fs.readFile(path.join(extensionFolder, "manifest.json"), "utf8"),
    ) as ExtensionManifest;
    return typeof manifest.version === "string" ? manifest.version : undefined;
  } catch {
    return undefined;
  }
}

export async function isExtensionCacheCurrent(extensionFolder: string, minimumVersion?: string): Promise<boolean> {
  const cachedVersion = await getCachedExtensionVersion(extensionFolder);
  if (!cachedVersion) {
    return false;
  }

  return minimumVersion ? isVersionAtLeast(cachedVersion, minimumVersion) : true;
}
