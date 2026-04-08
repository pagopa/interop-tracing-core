import {
  AWSConfig,
  ConsumerConfig,
  DbConfig,
  FileManagerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingStateUpdateronfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(DbConfig)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        SQS_ENDPOINT_PROCESSING_RESULTS_QUEUE: z.string(),
        SQS_ENDPOINT: z.string().nullish(),
        S3_TRACING_ERRORS_BUCKET_NAME: z.string(),
        AWS_ACCESS_KEY_ID: z.string().nullish(),
        AWS_SECRET_ACCESS_KEY: z.string().nullish(),
        AWS_SESSION_TOKEN: z.string().nullish(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        sqsEndpointProcessingResultsQueue:
          c.SQS_ENDPOINT_PROCESSING_RESULTS_QUEUE,
        sqsEndpoint: c.SQS_ENDPOINT,
        bucketTracingErrorsS3Name: c.S3_TRACING_ERRORS_BUCKET_NAME,
        awsAccessKeyId: c.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: c.AWS_SECRET_ACCESS_KEY,
        awsSessionToken: c.AWS_SESSION_TOKEN,
      })),
  );

export type TracingStateUpdateConfig = z.infer<typeof tracingStateUpdateronfig>;

export const config: TracingStateUpdateConfig = {
  ...tracingStateUpdateronfig.parse(process.env),
};
