import type { LoadExtensionOptions, Session } from "electron";
import { session } from "electron";
import fs from "fs/promises";
import * as path from "path";
import { getCachedExtensionVersion, isExtensionCacheCurrent, isVersionAtLeast } from "./cache";
import { getExtensionDownload } from "./download-url";
import { verifyFileSha256 } from "./integrity";
import unzip from "./unzip";
import { changePermissions, fetchCrxFile, getExtensionPath } from "./utils";

async function downloadChromeExtension(
  chromeStoreID: string,
  minimumVersion: string | undefined,
  forceDownload: boolean,
  attempts = 5,
): Promise<string> {
  const extensionsStore = getExtensionPath();
  const extensionFolder = path.resolve(extensionsStore, chromeStoreID);
  const filePath = `${extensionFolder}.crx`;

  try {
    await fs.mkdir(extensionsStore, { recursive: true });

    if (!forceDownload && (await isExtensionCacheCurrent(extensionFolder, minimumVersion))) {
      return extensionFolder;
    }

    await fs.rm(extensionFolder, { recursive: true, force: true });

    const chromeVersion = process.versions.chrome || 32;
    const download = getExtensionDownload(chromeStoreID, chromeVersion);
    await fetchCrxFile(download.url, filePath);

    if (download.sha256) {
      await verifyFileSha256(filePath, download.sha256);
    }

    await unzip(filePath, extensionFolder);

    const downloadedVersion = await getCachedExtensionVersion(extensionFolder);
    if (!downloadedVersion) {
      throw new Error(`Downloaded extension ${chromeStoreID} does not contain a valid manifest version`);
    }
    if (minimumVersion && !isVersionAtLeast(downloadedVersion, minimumVersion)) {
      throw new Error(
        `Downloaded extension ${chromeStoreID} is version ${downloadedVersion}, below required version ${minimumVersion}`,
      );
    }

    changePermissions(extensionFolder, 755);
    return extensionFolder;
  } catch (error) {
    await Promise.allSettled([
      fs.rm(extensionFolder, { recursive: true, force: true }),
      fs.rm(filePath, { force: true }),
    ]);

    if (attempts <= 1) {
      throw error;
    }

    console.warn(`Failed to fetch extension, trying ${attempts - 1} more times`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    return downloadChromeExtension(chromeStoreID, minimumVersion, forceDownload, attempts - 1);
  } finally {
    await fs.rm(filePath, { force: true }).catch(() => undefined);
  }
}

export interface ExtensionReference {
  /**
   * Extension ID
   */
  id: string;
  /**
   * Minimum working version. Older cached versions are downloaded again.
   */
  version?: string;
}

export interface ExtensionOptions {
  /**
   * Ignore whether the extension is already downloaded and redownload every time
   */
  forceDownload?: boolean;
  /**
   * Options passed to session.loadExtension
   */
  loadExtensionOptions?: LoadExtensionOptions;
  /**
   * The target session on which the extension shall be installed
   */
  session?: string | Session;
}

/**
 * @param extensionReference Extension or extensions to install
 * @param options Installation options
 * @returns A promise resolving with the name or names of the extensions installed
 */
export const installExtension = async (
  extensionReference: ExtensionReference | string | Array<ExtensionReference | string>,
  options: ExtensionOptions = {},
): Promise<string | string[]> => {
  const targetSession =
    typeof options.session === "string"
      ? session.fromPartition(options.session)
      : options.session || session.defaultSession;
  const { forceDownload, loadExtensionOptions } = options;

  if (process.type !== "browser") {
    throw new Error("electron-extension-installer can only be used from the main process");
  }

  if (Array.isArray(extensionReference)) {
    const installed = await Promise.all(extensionReference.map((extension) => installExtension(extension, options)));
    return installed.flat();
  }

  let chromeStoreID: string;
  let minimumVersion: string | undefined;
  if (typeof extensionReference === "object" && extensionReference.id) {
    chromeStoreID = extensionReference.id;
    minimumVersion = extensionReference.version;
  } else if (typeof extensionReference === "string") {
    chromeStoreID = extensionReference;
  } else {
    throw new Error(`Invalid extensionReference passed in: "${extensionReference}"`);
  }

  const extensionFolder = path.resolve(getExtensionPath(), chromeStoreID);
  const installedExtension =
    targetSession.extensions.getExtension(chromeStoreID) ||
    targetSession.extensions.getAllExtensions().find((extension) => path.resolve(extension.path) === extensionFolder);
  if (
    !forceDownload &&
    installedExtension &&
    (!minimumVersion || isVersionAtLeast(installedExtension.version, minimumVersion))
  ) {
    return installedExtension.name;
  }

  await downloadChromeExtension(chromeStoreID, minimumVersion, Boolean(forceDownload));
  if (installedExtension) {
    targetSession.extensions.removeExtension(installedExtension.id);
  }

  const extension = await targetSession.extensions.loadExtension(extensionFolder, loadExtensionOptions);
  if (minimumVersion && !isVersionAtLeast(extension.version, minimumVersion)) {
    targetSession.extensions.removeExtension(extension.id);
    await fs.rm(extensionFolder, { recursive: true, force: true });
    throw new Error(
      `Loaded extension ${chromeStoreID} is version ${extension.version}, below required version ${minimumVersion}`,
    );
  }

  return extension.name;
};
export default installExtension;
export * from "./extensions";

module.exports = Object.assign(installExtension, module.exports);
