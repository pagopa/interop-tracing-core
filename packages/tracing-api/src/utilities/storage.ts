import multer, { StorageEngine } from "multer";
import path from "path";
import { config } from "./config.js";
import { Request } from "express";
import fs from "fs";
import util from "util";

/**
 * Multer storage configuration
 * This setup saves uploaded files to the configured path with a unique filename.
 */
const storage: StorageEngine = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => cb(null, config.storagePathName),
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const uniqueFilename = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ storage: storage });
const unlink = util.promisify(fs.unlink);

export default { upload, unlink };
