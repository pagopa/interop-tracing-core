import { dbServiceBuilder } from "./services/db/dbService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "./services/producerService.js";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "./services/enrichedService.js";
import { config } from "./utilities/config.js";
import { processEnrichedStateMessage } from "./messageHandler.js";
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import {
  FileManager,
  SQS,
  fileManagerBuilder,
  initDB,
} from "pagopa-interop-tracing-commons";

const dbInstance = initDB({
  username: config.dbUsername,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  schema: config.dbSchemaName,
  useSSL: config.dbUseSSL,
});

const s3ClientConfig: S3ClientConfig = {
  endpoint: config.s3CustomServer
    ? `${config.s3ServerHost}:${config.s3ServerPort}`
    : undefined,
  forcePathStyle: config.s3CustomServer,
  logger: config.logLevel === "debug" ? console : undefined,
  region: config.awsRegion,
};
const s3client: S3Client = new S3Client(s3ClientConfig);

const sqsClient: SQS.SQSClient = await SQS.instantiateClient({
  region: config.awsRegion,
  ...(config.sqsEndpoint ? { endpoint: config.sqsEndpoint } : {}),
});

const fileManager: FileManager = fileManagerBuilder(
  s3client,
  config.bucketEnrichedS3Name,
);
const producerService: ProducerService = producerServiceBuilder(sqsClient);

const enrichedService: EnrichedService = enrichedServiceBuilder(
  dbServiceBuilder(dbInstance),
  producerService,
  fileManager,
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsEnrichedUploadEndpoint,
    consumerPollingTimeout: config.consumerPollingTimeout,
    serviceName: config.applicationName,
  },
  processEnrichedStateMessage(enrichedService),
);
