// These overrides are for extensions whose official CRX file hosted on Google uses Chrome APIs unsupported by Electron.
// Thankfully collected by @xupea. Pinning the files to an immutable revision prevents existing package releases from
// changing behavior when the repository's default branch changes.
export const OVERRIDE_REVISION = "9f1949d045db1feb8d221e5345786a79522e3efb";

const OVERRIDE_SHA256 = new Map<string, string>([
  ["bhljhndlimiafopmmhjlgfpnnchjjbhd", "571c1db436dbc8fef0f78cf406f56ae96a95277048c919535e82c1aeb71fd455"],
  ["bmdblncegkenkacieihfhpjfppoconhi", "8477c4e361770eaf00221cf3fe6e767a0c776414a352587bfc9360b22d1ece4f"],
  ["dbhhnnnpaeobfddmlalhnehgclcmjimi", "6be47961af782de965417cba6e02316957c1a9a99f443e0f896019796c2d74bd"],
  ["fmkadmapgofadopljbjfkapdkoienihi", "0f1fe24bfcd8f1c0dd0eb96507f807176cf1efea925fdae2ea3887cb0da0f4c7"],
  ["ienfalfjdbdpebioblfackkekamfmbnh", "7427daf68aa3ddf99feba553ebb9e047dc58eebe229c3fb2af3d93f4b86a39da"],
  ["jdkknkkbebbapilgoeccciglkfbmbnfm", "98211d9d5c9805c039669cfe8d69af77b56ed0897f76757fe46f5f92613980d9"],
  ["nhdogjmejiglipccpnnnanhbledajbpd", "d47a47fb74d8e7a78f7369fdb91b40eb5f887db29d9a25c61c0a45897606179b"],
  ["pfgnfdagidkfgccljigdamigbcnndkod", "a63693e80b06f6835d054de7e3ca85fb7a315433251df68ecf178e8baa355faf"],
]);

export interface ExtensionDownload {
  sha256?: string;
  url: string;
}

export function getExtensionDownload(chromeStoreID: string, chromeVersion: string | number): ExtensionDownload {
  const sha256 = OVERRIDE_SHA256.get(chromeStoreID);
  if (sha256) {
    return {
      sha256,
      url: `https://raw.githubusercontent.com/jonluca/electron-extension-installer/${OVERRIDE_REVISION}/overrides/${chromeStoreID}.crx`,
    };
  }

  return {
    url: `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${encodeURIComponent(chromeStoreID)}%26uc&prodversion=${encodeURIComponent(String(chromeVersion))}`,
  };
}

export function getExtensionDownloadUrl(chromeStoreID: string, chromeVersion: string | number): string {
  return getExtensionDownload(chromeStoreID, chromeVersion).url;
}
