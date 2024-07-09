import { initDB } from "pagopa-interop-tracing-commons";
import { processMessage } from "./messageHandler.js";
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
const replacementService: ReplacementServiceBuilder = replacementServiceBuilder(
  dbServiceBuilder(dbInstance),
  producerService,
);
const enrichedService: EnrichedService = enrichedServiceBuilder(
  dbServiceBuilder(dbInstance),
  bucketService,
  producerService,
);

processMessage(enrichedService, replacementService);
