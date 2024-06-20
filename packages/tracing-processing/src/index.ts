import { initDB } from "pagopa-interop-tracing-commons";
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
  schema: dbConfig.dbSchemaName,
  useSSL: dbConfig.dbUseSSL,
});

const bucketService: BucketService = bucketServiceBuilder();
const producerService: ProducerService = producerServiceBuilder();
const processingService: ProcessingService = processingServiceBuilder(
  dbServiceBuilder(dbInstance),
  bucketService,
  producerService,
);

processMessage(producerService, processingService);
