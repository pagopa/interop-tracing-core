import { runConsumer } from "kafka-connector";
import { config } from "./utilities/config.js";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "./services/operationsService.js";
import { processMessage } from "./messagesHandler.js";

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const operationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

await runConsumer(
  config,
  [config.kafkaTopic],
  processMessage(operationsService),
);
