import { SQS } from "pagopa-interop-tracing-commons";
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
});

await Promise.all([
  SQS.runConsumer(
    sqsClient,
    {
      queueUrl: config.sqsEndpointProcessingErrorQueue,
      consumerPollingTimeout: config.consumerPollingTimeout,
      serviceName: config.applicationName,
    },
    processPurposeErrorMessage(OperationsService),
  ),
  SQS.runConsumer(
    sqsClient,
    {
      queueUrl: config.sqsEndpointEnricherStateQueue,
      consumerPollingTimeout: config.consumerPollingTimeout,
      serviceName: config.applicationName,
    },
    processTracingStateMessage(OperationsService),
  ),
]);
