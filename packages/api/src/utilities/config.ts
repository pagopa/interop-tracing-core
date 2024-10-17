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
        CORS_ORIGIN_ALLOWED: z.string().optional(),
        STORAGE_PATH_NAME: z.string(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        operationsBaseUrl: c.API_OPERATIONS_BASEURL,
        corsOriginAllowed: c.CORS_ORIGIN_ALLOWED,
        storagePathName: c.STORAGE_PATH_NAME,
      })),
  );

export type ApiConfig = z.infer<typeof apiConfig>;

export const config: ApiConfig = {
  ...apiConfig.parse(process.env),
};
