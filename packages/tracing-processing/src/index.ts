import { SQS, initDB } from "pagopa-interop-tracing-commons";
import { processMessage } from "./messageHandler.js";
import { dbServiceBuilder } from "./services/db/dbService.js";
import {
  ProcessingService,
  processingServiceBuilder,
} from "./services/processingService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "./services/producerService.js";
import { dbConfig } from "./utilities/dbConfig.js";
import { config } from "./utilities/config.js";

import {
  bucketServiceBuilder,
  BucketService,
} from "./services/bucketService.js";
const dbInstance = initDB({
  username: dbConfig.dbUsername,
  password: dbConfig.dbPassword,
  host: dbConfig.dbHost,
  port: dbConfig.dbPort,
  database: dbConfig.dbName,
  schema: dbConfig.schemaName,
  useSSL: dbConfig.dbUseSSL,
});

const sqsClient: SQS.SQSClient = await SQS.instantiateClient({
  region: config.awsRegion,
});

const bucketService: BucketService = bucketServiceBuilder();
const producerService: ProducerService = producerServiceBuilder(sqsClient);
const processingService: ProcessingService = processingServiceBuilder(
  dbServiceBuilder(dbInstance),
  bucketService,
  producerService,
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsEndpointConsumer,
    consumerPollingTimeout: config.consumerPollingTimeout,
  },
  processMessage(producerService, processingService),
);
