import { dbServiceBuilder } from "./services/db/dbService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "./services/producerService.js";
import { dbConfig } from "./utilities/dbConfig.js";
import {
  bucketServiceBuilder,
  BucketService,
} from "./services/bucketService.js";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "./services/enrichedService.js";
import {
  ReplacementServiceBuilder,
  replacementServiceBuilder,
} from "./services/replacementService.js";
import { config } from "./utilities/config.js";
import {
  processReplacementUploadMessage,
  processEnrichedStateMessage,
} from "./messageHandler.js";
import { S3Client } from "@aws-sdk/client-s3";
import { initDB, SQS } from "pagopa-interop-tracing-commons";
const dbInstance = initDB({
  username: dbConfig.dbUsername,
  password: dbConfig.dbPassword,
  host: dbConfig.dbHost,
  port: dbConfig.dbPort,
  database: dbConfig.dbName,
  schema: dbConfig.dbSchemaName,
  useSSL: dbConfig.dbUseSSL,
});
const s3client: S3Client = new S3Client({
  region: config.awsRegion,
});
const bucketService: BucketService = bucketServiceBuilder(s3client);
const producerService: ProducerService = producerServiceBuilder();

const replacementService: ReplacementServiceBuilder = replacementServiceBuilder(
  dbServiceBuilder(dbInstance),
  producerService,
);
const enrichedService: EnrichedService = enrichedServiceBuilder(
  dbServiceBuilder(dbInstance),
  bucketService,
  producerService,
);

const sqsClient: SQS.SQSClient = await SQS.instantiateClient({
  region: config.awsRegion,
});

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsReplacementUploadEndpoint,
    consumerPollingTimeout: config.consumerPollingTimeout,
  },
  processReplacementUploadMessage(replacementService),
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsEnrichedUploadEndpoint,
    consumerPollingTimeout: config.consumerPollingTimeout,
  },
  processEnrichedStateMessage(enrichedService),
);
