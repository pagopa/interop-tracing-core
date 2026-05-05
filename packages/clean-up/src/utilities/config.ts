import { LoggerConfig } from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingCleanUpConfig = LoggerConfig.and(
  z
    .object({
      APPLICATION_NAME: z.string(),
      API_OPERATIONS_BASEURL: z.string(),
    })
    .transform((c) => ({
      applicationName: c.APPLICATION_NAME,
      operationsBaseUrl: c.API_OPERATIONS_BASEURL,
    })),
);

export type TracingCleanUpConfig = z.infer<typeof tracingCleanUpConfig>;

export const config: TracingCleanUpConfig = {
  ...tracingCleanUpConfig.parse(process.env),
};
