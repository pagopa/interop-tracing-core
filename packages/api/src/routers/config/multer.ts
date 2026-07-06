import multer, { FileFilterCallback, MulterError, StorageEngine } from "multer";
import path from "path";
import { config } from "../../utilities/config.js";
import { Request, Response, NextFunction } from "express";
import fs from "fs";
import util from "util";
import { ZodiosApp, ZodiosRouterContextRequestHandler } from "@zodios/express";
import { api } from "../../model/generated/api.js";
import { ApiExternal } from "../../model/types.js";
import { LocalExpressContext } from "../../context/index.js";
import {
  badRequestError,
  makeApiProblemBuilder,
} from "pagopa-interop-tracing-models";
import { constants } from "http2";
import { logger } from "pagopa-interop-tracing-commons";

const makeApiProblem = makeApiProblemBuilder({});

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
 * Filters the given type to only include those with a specific request format.
 *
 * @template T - The type to filter.
 */
type FilterByRequestFormat<T extends { requestFormat: string }, U> = T extends {
  requestFormat: U;
}
  ? T
  : never;

/**
 * Filters the API endpoints to only include those that use the "form-data" request format.
 */
const apiWithFormData = api.api.filter(
  (el): el is FilterByRequestFormat<typeof el, "form-data"> =>
    el.requestFormat === "form-data",
);

/**
 * Configures endpoints for handling file uploads using Multer.
 * This function sets up the handler for routes that accept form data,
 * ensuring that uploaded files are processed and stored based on the provided configuration.
 *
 * @param app - The Zodios application instance to configure.
 */
export const configureMulterEndpoints = (
  app: ZodiosApp<ApiExternal, LocalExpressContext>,
) => {
  for (const endpoint of apiWithFormData) {
    app[endpoint.method as keyof ZodiosApp<ApiExternal, LocalExpressContext>](
      endpoint.path,
      uploadSingleFile,
      attachFileInstance,
    );
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
    const uniqueFilename = `${file.fieldname}-${Date.now()}${path.extname(
      file.originalname,
    )}`;
    cb(null, uniqueFilename);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  const allowedFileName = /^[A-Za-z0-9-]+\.csv$/;

  if (!allowedFileName.test(file.originalname)) {
    return cb(new Error("Invalid uploaded file name."));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxUploadFileSizeBytes,
  },
});

const uploadSingleFile: ZodiosRouterContextRequestHandler<
  LocalExpressContext
> = (req, res, next): void =>
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      return next();
    }

    const detail =
      error instanceof MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds the maximum allowed size."
        : error instanceof Error
        ? error.message
        : "Invalid uploaded file.";

    const problem = makeApiProblem(
      badRequestError(detail),
      () => constants.HTTP_STATUS_BAD_REQUEST,
      logger(req.ctx),
      req.ctx.correlationId,
    );

    return res.status(problem.status).json(problem).end();
  });

const unlink = util.promisify(fs.unlink);

export default { unlink };
