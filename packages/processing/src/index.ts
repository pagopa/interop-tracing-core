import { SQS, initDB } from "pagopa-interop-tracing-commons";
import { processMessage } from "./messageHandler.js";
import { dbServiceBuilder } from "./services/enricherService.js";
import {
  ProcessingService,
  processingServiceBuilder,
} from "./services/processingService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "./services/producerService.js";
import { config } from "./utilities/config.js";
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import {
  FileManager,
  fileManagerBuilder,
} from "../../commons/src/file-manager/fileManager.js";

const dbInstance = initDB({
  username: config.dbUsername,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  schema: config.dbSchemaName,
  useSSL: config.dbUseSSL,
});

const sqsClient: SQS.SQSClient = await SQS.instantiateClient({
  region: config.awsRegion,
  ...(config.sqsEndpoint ? { endpoint: config.sqsEndpoint } : {}),
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

const fileManager: FileManager = fileManagerBuilder(s3client);
const producerService: ProducerService = producerServiceBuilder(sqsClient);
const processingService: ProcessingService = processingServiceBuilder(
  dbServiceBuilder(dbInstance),
  fileManager,
  producerService,
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsTracingUploadEndpoint,
    consumerPollingTimeout: config.consumerPollingTimeout,
    serviceName: config.applicationName,
  },
  processMessage(processingService),
);
