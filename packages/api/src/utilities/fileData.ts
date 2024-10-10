import path from "path";
import fs from "fs";
import { ExpressMulterFile } from "../model/multer.js";

export async function readExpressMulterFile(file: ExpressMulterFile): Promise<Buffer> {
  const filePath = path.resolve(file.path);
  return await fs.promises.readFile(filePath);
}

