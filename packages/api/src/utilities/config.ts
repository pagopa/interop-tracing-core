import {
  HTTPServerConfig,
  LoggerConfig,
  AWSConfig,
  S3Config,
  FileManagerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const apiConfig = HTTPServerConfig.and(LoggerConfig)
  .and(AWSConfig)
  .and(S3Config)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        API_OPERATIONS_BASEURL: z.string(),
        STORAGE_PATH_NAME: z.string(),
        MAX_UPLOAD_FILE_SIZE_BYTES: z.coerce
          .number()
          .int()
          .positive()
          .default(200 * 1024 * 1024),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        operationsBaseUrl: c.API_OPERATIONS_BASEURL,
        storagePathName: c.STORAGE_PATH_NAME,
        maxUploadFileSizeBytes: c.MAX_UPLOAD_FILE_SIZE_BYTES,
      })),
  );

export type ApiConfig = z.infer<typeof apiConfig>;

export const config: ApiConfig = {
  ...apiConfig.parse(process.env),
};
