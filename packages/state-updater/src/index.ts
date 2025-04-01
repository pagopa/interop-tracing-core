import { logger, SQS } from "pagopa-interop-tracing-commons";
import { config } from "./utilities/config.js";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  processPurposeErrorMessage,
  processTracingStateMessage,
} from "./messagesHandler.js";
import {
  OperationsService,
  operationsServiceBuilder,
} from "./services/operationsService.js";

const operationsApiClient = createApiClient(config.operationsBaseUrl);

const OperationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

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
    processPurposeErrorMessage(OperationsService),
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
    processTracingStateMessage(OperationsService),
    logger({ serviceName: config.applicationName }),
  ),
]);
