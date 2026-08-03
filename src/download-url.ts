// These overrides are for extensions whose official CRX file hosted on Google uses Chrome APIs unsupported by Electron.
// Thankfully collected by @xupea.
const OVERRIDES = new Set([
  "bhljhndlimiafopmmhjlgfpnnchjjbhd",
  "bmdblncegkenkacieihfhpjfppoconhi",
  "dbhhnnnpaeobfddmlalhnehgclcmjimi",
  "fmkadmapgofadopljbjfkapdkoienihi",
  "ienfalfjdbdpebioblfackkekamfmbnh",
  "jdkknkkbebbapilgoeccciglkfbmbnfm",
  "nhdogjmejiglipccpnnnanhbledajbpd",
  "pfgnfdagidkfgccljigdamigbcnndkod",
]);

export function getExtensionDownloadUrl(chromeStoreID: string, chromeVersion: string | number): string {
  if (OVERRIDES.has(chromeStoreID)) {
    return `https://github.com/jonluca/electron-extension-installer/raw/main/overrides/${chromeStoreID}.crx`;
  }

  return `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${chromeStoreID}%26uc&prodversion=${chromeVersion}`;
}
