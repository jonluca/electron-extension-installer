import type { LoadExtensionOptions } from "electron";
import { session } from "electron";
import * as semver from "semver";
import * as path from "path";
import * as rimraf from "rimraf";
import unzip from "./unzip";
import { changePermissions, fetchCrxFile, getExtensionPath, getIdMap } from "./utils";
import jetpack from "fs-jetpack";

// These overrides are for extensions whose official CRX file hosted on google uses Chrome APIs unsupported by electron
// Thankfully collected by @xupea
const OVERRIDES = [
  "bhljhndlimiafopmmhjlgfpnnchjjbhd",
  "bmdblncegkenkacieihfhpjfppoconhi",
  "dbhhnnnpaeobfddmlalhnehgclcmjimi",
  "fmkadmapgofadopljbjfkapdkoienihi",
  "ienfalfjdbdpebioblfackkekamfmbnh",
  "jdkknkkbebbapilgoeccciglkfbmbnfm",
  "lmhkpmbekcpmknklioeibfkpmmfibljd",
  "nhdogjmejiglipccpnnnanhbledajbpd",
  "pfgnfdagidkfgccljigdamigbcnndkod",
];
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
      const chromeVersion = process.versions.chrome || 32;
      let fileURL = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${chromeStoreID}%26uc&prodversion=${chromeVersion}`;
      if (OVERRIDES.includes(chromeStoreID)) {
        fileURL = `https://github.com/jonluca/electron-extension-installer/raw/main/overrides/${chromeStoreID}.crx`;
      }

      const filePath = path.resolve(`${extensionFolder}.crx`);
      await fetchCrxFile(fileURL, filePath);

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
    throw new Error("electron-devtools-assembler can only be used from the main process");
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
      throw new Error(
        `Version of Electron: ${electronVersion} does not match required range ${extensionReference.electron} for extension ${chromeStoreID}`,
      );
    }
  } else if (typeof extensionReference === "string") {
    chromeStoreID = extensionReference;
  } else {
    throw new Error(`Invalid extensionReference passed in: "${extensionReference}"`);
  }

  const IDMap = getIdMap();
  const extensionName = IDMap[chromeStoreID];
  // todo - should we check id here?
  const installedExtension = session.defaultSession.getAllExtensions().find((e) => e.name === extensionName);

  if (!forceDownload && installedExtension) {
    return IDMap[chromeStoreID];
  }

  const extensionFolder = await downloadChromeExtension(chromeStoreID, Boolean(forceDownload));
  // Use forceDownload, but already installed
  if (installedExtension) {
    session.defaultSession.removeExtension(installedExtension.id);
  }

  const ext = await session.defaultSession.loadExtension(extensionFolder, loadExtensionOptions);
  return ext.name;
};
export default installExtension;
export * from "./extensions";
