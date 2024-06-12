import multer, { StorageEngine } from "multer";
import path from "path";
import { config } from "../../utilities/config.js";
import { Request, Response, NextFunction } from "express";
import fs from "fs";
import util from "util";
import { ZodiosApp } from "@zodios/express";
import { api } from "../../model/generated/api.js";
import { ApiExternal } from "../../model/types.js";
import { ExpressContext } from "pagopa-interop-tracing-commons";
import { match } from "ts-pattern";

/**
 * Middleware function to handle file uploads.
 * This function ensures that the uploaded file instance is attached to the request body as 'file',
 * which is necessary for correct validation of file uploads using Zodios validations.
 */
const attachFileInstance = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.file) {
    req.body.file = req.file;
  }
  next();
};

/**
 * Function to configure endpoints for handling file uploads using Multer.
 * This function sets up routes for PUT and POST requests with form data,
 * ensuring that uploaded files are processed and stored based on the provided configuration.
 */
export const configureMulterEndpoints = (
  app: ZodiosApp<ApiExternal, ExpressContext>,
) => {
  const submit = "/tracings/submit";
  const recover = "/tracings/:tracingId/recover";
  const replace = "/tracings/:tracingId/replace";

  for (const endpoint of api.api) {
    if (endpoint.requestFormat === "form-data") {
      match(endpoint.path)
        .with(submit, () =>
          app.post(submit, upload.single("file"), attachFileInstance),
        )
        .with(recover, () =>
          app.put(recover, upload.single("file"), attachFileInstance),
        )
        .with(replace, () =>
          app.put(replace, upload.single("file"), attachFileInstance),
        )
        .exhaustive();
    }
  }
};

/**
 * Multer storage configuration.
 * This setup defines how uploaded files are stored temporary using disk storage,
 * ensuring each file is saved with a unique filename in the configured destination directory.
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

export default { unlink };
