import {
  fileManagerBuilder,
  initDB,
  logger,
  SQS,
} from "pagopa-interop-tracing-commons";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "./utilities/config.js";
import { processProcessingResultMessage } from "./messagesHandler.js";
import { dbServiceBuilder, DBService } from "./services/db/dbService.js";
import {
  tracingStoreServiceBuilder,
  TracingStoreService,
} from "./services/tracingStoreService.js";

const tracingStoreDb = initDB({
  username: config.dbUsername,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  schema: config.dbSchemaName,
  useSSL: config.dbUseSSL,
});

const s3Client = new S3Client({
  region: config.awsRegion,
  ...(config.s3CustomServer
    ? {
        endpoint: `${config.s3ServerHost}:${config.s3ServerPort}`,
        forcePathStyle: true,
      }
    : {}),
});
const fileManager = fileManagerBuilder(
  s3Client,
  config.bucketTracingErrorsS3Name,
);

const dbService: DBService = dbServiceBuilder(tracingStoreDb);
const tracingStoreService: TracingStoreService = tracingStoreServiceBuilder(
  tracingStoreDb,
  dbService,
  fileManager,
);

const sqsClient: SQS.SQSClient = await SQS.instantiateClient({
  region: config.awsRegion,
  ...(config.sqsEndpoint ? { endpoint: config.sqsEndpoint } : {}),
});

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsEndpointProcessingResultsQueue,
    maxNumberOfMessages: config.maxNumberOfMessages,
    waitTimeSeconds: config.waitTimeSeconds,
    visibilityTimeout: config.visibilityTimeout,
    serviceName: config.applicationName,
  },
  processProcessingResultMessage(tracingStoreService),
  logger({ serviceName: config.applicationName }),
);
