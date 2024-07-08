import { describe, expect, it } from "vitest";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "../src/services/enrichedService.js";
import {
  BucketService,
  bucketServiceBuilder,
} from "../src/services/bucketService.js";
import { dbServiceBuilder } from "../src/services/db/dbService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "../src/services/producerService.js";
import { dbConfig } from "../src/utilities/dbConfig.js";
import { SQS, initDB } from "pagopa-interop-tracing-commons";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../src/utilities/config.js";

describe("Processing Service", () => {
  let enrichedService: EnrichedService;
  const s3client: S3Client = new S3Client({
    region: config.awsRegion,
  });
  const sqsClient: SQS.SQSClient = SQS.instantiateClient({
    region: config.awsRegion,
  });
  const bucketService: BucketService = bucketServiceBuilder(s3client);
  const producerService: ProducerService = producerServiceBuilder(sqsClient);

  describe("Processing service", () => {
    const dbInstance = initDB({
      username: dbConfig.dbUsername,
      password: dbConfig.dbPassword,
      host: dbConfig.dbHost,
      port: dbConfig.dbPort,
      database: dbConfig.dbName,
      schema: dbConfig.dbSchemaName,
      useSSL: dbConfig.dbUseSSL,
    });
    enrichedService = enrichedServiceBuilder(
      dbServiceBuilder(dbInstance),
      bucketService,
      producerService,
    );
    describe("insert tracing", () => {
      it("it should insert a tracing", async () => {
        console.log(enrichedService);
        expect({}).toStrictEqual({});
      });
    });
  });
});
