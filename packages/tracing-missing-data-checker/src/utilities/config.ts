import { LoggerConfig } from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingMissingDataCheckerConfig = LoggerConfig.and(
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

export type TracingMissingDataCheckerConfig = z.infer<
  typeof tracingMissingDataCheckerConfig
>;

export const config: TracingMissingDataCheckerConfig = {
  ...tracingMissingDataCheckerConfig.parse(process.env),
};
