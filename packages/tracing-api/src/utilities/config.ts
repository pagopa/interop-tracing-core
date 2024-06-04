import { HTTPServerConfig, LoggerConfig } from "pagopa-interop-tracing-commons";
import { z } from "zod";

const apiConfig = HTTPServerConfig.and(LoggerConfig).and(
  z
    .object({
      APPLICATION_NAME: z.string(),
      API_OPERATIONS_BASEURL: z.string(),
      CORS_ORIGIN_ALLOWED: z.string(),
    })
    .transform((c) => ({
      applicationName: c.APPLICATION_NAME,
      operationsBaseUrl: c.API_OPERATIONS_BASEURL,
      corsOriginAllowed: c.CORS_ORIGIN_ALLOWED,
    })),
);

export type ApiConfig = z.infer<typeof apiConfig>;

export const config: ApiConfig = {
  ...apiConfig.parse(process.env),
};
