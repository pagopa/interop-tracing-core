import { dbServiceBuilder } from "./services/db/dbService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "./services/producerService.js";
// import {
//   bucketServiceBuilder,
//   BucketService,
// } from "./services/bucketService.js";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "./services/enrichedService.js";
import { config } from "./utilities/config.js";
import { processEnrichedStateMessage } from "./messageHandler.js";
import { S3Client } from "@aws-sdk/client-s3";
import { SQS, initDB } from "pagopa-interop-tracing-commons";
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

const s3client: S3Client = new S3Client({
  region: config.awsRegion,
});

const sqsClient: SQS.SQSClient = await SQS.instantiateClient({
  region: config.awsRegion,
});

//  const bucketService: BucketService = bucketServiceBuilder(s3client);
const bucketService: FileManager = fileManagerBuilder(s3client);
const producerService: ProducerService = producerServiceBuilder(sqsClient);

const enrichedService: EnrichedService = enrichedServiceBuilder(
  dbServiceBuilder(dbInstance),
  bucketService,
  producerService,
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
