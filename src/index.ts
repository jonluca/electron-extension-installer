import type { LoadExtensionOptions } from "electron";
import { session } from "electron";
import * as semver from "semver";
import * as path from "path";
import * as rimraf from "rimraf";
import unzip from "./unzip";
import { changePermissions, downloadFile, getExtensionPath, getIdMap } from "./utils";
import jetpack from "fs-jetpack";

async function downloadChromeExtension(chromeStoreID: string, forceDownload: boolean, attempts = 5): Promise<string> {
  try {
    const extensionsStore = getExtensionPath();
    await jetpack.dirAsync(extensionsStore);
    const extensionFolder = path.resolve(`${extensionsStore}/${chromeStoreID}`);
    const extensionDirExists = await jetpack.existsAsync(extensionFolder);
    if (!extensionDirExists || forceDownload) {
      if (extensionDirExists) {
        rimraf.sync(extensionFolder);
      }
      const fileURL = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${chromeStoreID}%26uc&prodversion=32`;
      const filePath = path.resolve(`${extensionFolder}.crx`);
      await downloadFile(fileURL, filePath);

      try {
        await unzip(filePath, extensionFolder);
        changePermissions(extensionFolder, 755);
        return extensionFolder;
      } catch (err: any) {
        if (!(await jetpack.existsAsync(path.resolve(extensionFolder, "manifest.json")))) {
          throw err;
        }
      }
    } else {
      return extensionFolder;
    }
  } catch (err) {
    console.log(`Failed to fetch extension, trying ${attempts - 1} more times`);
    if (attempts <= 1) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return downloadChromeExtension(chromeStoreID, forceDownload, attempts - 1);
  }

  throw new Error("Failed to fetch extension");
}

export interface ExtensionReference {
  /**
   * Extension ID
   */
  id: string;
  /**
   * Range of electron versions this extension is supported by
   */
  electron: string;
  /**
   * Working version
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
  const { forceDownload, loadExtensionOptions } = options;

  if (process.type !== "browser") {
    return Promise.reject(new Error("electron-devtools-assembler can only be used from the main process"));
  }

  if (Array.isArray(extensionReference)) {
    const installed = await Promise.all(extensionReference.map((extension) => installExtension(extension, options)));
    return installed.flat();
  }
  let chromeStoreID: string;
  if (typeof extensionReference === "object" && extensionReference.id) {
    chromeStoreID = extensionReference.id;
    const electronVersion = process.versions.electron.split("-")[0];
    if (!semver.satisfies(electronVersion, extensionReference.electron)) {
      return Promise.reject(
        new Error(
          `Version of Electron: ${electronVersion} does not match required range ${extensionReference.electron} for extension ${chromeStoreID}`,
        ), // eslint-disable-line
      );
    }
  } else if (typeof extensionReference === "string") {
    chromeStoreID = extensionReference;
  } else {
    return Promise.reject(new Error(`Invalid extensionReference passed in: "${extensionReference}"`));
  }

  const IDMap = getIdMap();
  const extensionName = IDMap[chromeStoreID];
  const extensionInstalled: boolean =
    !!extensionName &&
    session.defaultSession.getAllExtensions().some((e: { name: string }) => e.name === extensionName);

  if (!forceDownload && extensionInstalled) {
    return Promise.resolve(IDMap[chromeStoreID]);
  }
  return downloadChromeExtension(chromeStoreID, Boolean(forceDownload)).then((extensionFolder) => {
    // Use forceDownload, but already installed
    if (extensionInstalled) {
      const extensionId = session.defaultSession.getAllExtensions().find((e: { name: string }) => e.name)?.id;
      if (extensionId) {
        session.defaultSession.removeExtension(extensionId);
      }
    }

    return session.defaultSession.loadExtension(extensionFolder, loadExtensionOptions).then((ext: { name: string }) => {
      return Promise.resolve(ext.name);
    });
  });
};
export default installExtension;
export * from "./extensions";
