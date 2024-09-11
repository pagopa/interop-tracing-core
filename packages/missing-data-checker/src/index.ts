import { config } from "./utilities/config.js";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import { processTask } from "./processTask.js";
import {
  OperationsService,
  operationsServiceBuilder,
} from "./services/operationsService.js";

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const operationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

await processTask(operationsService);
