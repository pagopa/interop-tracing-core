import { initDB, logger, SQS } from "pagopa-interop-tracing-commons";
import { config } from "./utilities/config.js";
import {
  processPurposeErrorMessage,
  processTracingStateMessage,
} from "./messagesHandler.js";
import {
  TracingStoreDbService,
  tracingStoreDbServiceBuilder,
} from "./services/tracingStoreDbService.js";

const tracingStoreDb = initDB({
  username: config.dbUsername,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  schema: config.dbSchemaName,
  useSSL: config.dbUseSSL,
});

const tracingStoreDbService: TracingStoreDbService =
  tracingStoreDbServiceBuilder(tracingStoreDb);

const sqsClient: SQS.SQSClient = await SQS.instantiateClient({
  region: config.awsRegion,
  ...(config.sqsEndpoint ? { endpoint: config.sqsEndpoint } : {}),
});

await Promise.all([
  SQS.runConsumer(
    sqsClient,
    {
      queueUrl: config.sqsEndpointProcessingErrorQueue,
      maxNumberOfMessages: config.maxNumberOfMessages,
      waitTimeSeconds: config.waitTimeSeconds,
      visibilityTimeout: config.visibilityTimeout,
      serviceName: config.applicationName,
    },
    processPurposeErrorMessage(tracingStoreDbService),
    logger({ serviceName: config.applicationName }),
  ),
  SQS.runConsumer(
    sqsClient,
    {
      queueUrl: config.sqsEndpointEnricherStateQueue,
      maxNumberOfMessages: config.maxNumberOfMessages,
      waitTimeSeconds: config.waitTimeSeconds,
      visibilityTimeout: config.visibilityTimeout,
      serviceName: config.applicationName,
    },
    processTracingStateMessage(tracingStoreDbService),
    logger({ serviceName: config.applicationName }),
  ),
]);
