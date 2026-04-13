import { dbServiceBuilder } from "./services/db/dbService.js";
import { tracingStoreDbServiceBuilder } from "./services/db/tracingStoreDbService.js";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "./services/enrichedService.js";
import { config } from "./utilities/config.js";
import { processEnrichedStateMessage } from "./messageHandler.js";
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import {
  DBContext,
  FileManager,
  SQS,
  fileManagerBuilder,
  initDB,
  logger,
} from "pagopa-interop-tracing-commons";
import { setupDbServiceBuilder } from "./utilities/setupDbService.js";
import { retryConnection } from "./services/db/connection.js";
import { TracingTable } from "./models/traces.js";
const dbInstance = initDB({
  username: config.tracesStoreDbUsername,
  password: config.tracesStoreDbPassword,
  host: config.tracesStoreDbHost,
  port: config.tracesStoreDbPort,
  database: config.tracesStoreDbName,
  schema: config.tracesStoreDbSchemaName,
  useSSL: config.tracesStoreDbUseSSL,
});

const connection = await dbInstance.connect();

const dbContext: DBContext = {
  conn: connection,
  pgp: dbInstance.$config.pgp,
};

const tracingStoreDbInstance = initDB({
  username: config.tracingStoreDbUsername,
  password: config.tracingStoreDbPassword,
  host: config.tracingStoreDbHost,
  port: config.tracingStoreDbPort,
  database: config.tracingStoreDbName,
  schema: config.tracingStoreDbSchemaName,
  useSSL: config.tracingStoreDbUseSSL,
});

await retryConnection(
  dbInstance,
  dbContext,
  config,
  async (db) => {
    await setupDbServiceBuilder(db.conn).setupStagingTables([
      TracingTable.Traces,
    ]);
  },
  logger({ serviceName: config.applicationName }),
);

const s3ClientConfig: S3ClientConfig = {
  endpoint: config.s3CustomServer
    ? `${config.s3ServerHost}:${config.s3ServerPort}`
    : undefined,
  forcePathStyle: config.s3CustomServer,
  logger: config.logLevel === "debug" ? console : undefined,
  region: config.awsRegion,
};
const s3client: S3Client = new S3Client(s3ClientConfig);

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  ...(config.sqsEndpoint ? { endpoint: config.sqsEndpoint } : {}),
});

const fileManager: FileManager = fileManagerBuilder(
  s3client,
  config.bucketEnrichedS3Name,
);
const enrichedService: EnrichedService = enrichedServiceBuilder(
  dbServiceBuilder(dbContext),
  fileManager,
  tracingStoreDbServiceBuilder(tracingStoreDbInstance),
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsEnrichedUploadEndpoint,
    maxNumberOfMessages: config.maxNumberOfMessages,
    waitTimeSeconds: config.waitTimeSeconds,
    visibilityTimeout: config.visibilityTimeout,
    serviceName: config.applicationName,
  },
  processEnrichedStateMessage(enrichedService),
  logger({ serviceName: config.applicationName }),
);
