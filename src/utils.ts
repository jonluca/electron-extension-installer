import fs from "fs";
import path from "path";
import { app, net } from "electron";

export const getExtensionPath = () => {
  const savePath = app.getPath("userData");
  return path.resolve(`${savePath}/extensions`);
};

export const fetchCrxFile = async (from: string, to: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const request = net.request(from);

    request.on("response", (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file. Status code: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(to);
      // @ts-ignore - pipe exists here, not sure why the type is wrong
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });

      fileStream.on("error", (err) => {
        fs.unlink(to, () => reject(err));
      });

      response.on("error", (err: any) => {
        fs.unlink(to, () => reject(err));
      });
    });

    request.on("error", (err) => {
      reject(err);
    });

    request.end();
  });
};
export const changePermissions = (dir: string, mode: string | number) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    fs.chmodSync(filePath, parseInt(`${mode}`, 8));
    if (fs.statSync(filePath).isDirectory()) {
      changePermissions(filePath, mode);
    }
  });
};
const getIDMapPath = () => path.resolve(getExtensionPath(), "IDMap.json");
export const getIdMap = () => {
  if (fs.existsSync(getIDMapPath())) {
    try {
      return JSON.parse(fs.readFileSync(getIDMapPath(), "utf8"));
    } catch (err) {
      console.error("electron-devtools-assembler: Invalid JSON present in the IDMap file");
    }
  }
  return {};
};
