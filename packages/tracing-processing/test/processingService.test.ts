import { describe, expect, it } from "vitest";
import {
  ProcessingService,
  processingServiceBuilder,
} from "../src/services/processingService.js";
import { dbServiceBuilder } from "../src/services/db/dbService.js";
import { dbConfig } from "../src/utilities/dbConfig.js";
import { SQS, initDB } from "pagopa-interop-tracing-commons";
import {
  BucketService,
  bucketServiceBuilder,
} from "../src/services/bucketService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "../src/services/producerService.js";
import { config } from "../src/utilities/config.js";
import { S3Client } from "@aws-sdk/client-s3";

describe("Processing Service", () => {
  const sqsClient: SQS.SQSClient = SQS.instantiateClient({
    region: config.awsRegion,
  });
  const s3client: S3Client = new S3Client({ region: config.awsRegion });

  let processingService: ProcessingService;
  const bucketService: BucketService = bucketServiceBuilder(s3client);
  const producerService: ProducerService = producerServiceBuilder(sqsClient);
  describe("Processing service", () => {
    const dbInstance = initDB({
      username: dbConfig.dbUsername,
      password: dbConfig.dbPassword,
      host: dbConfig.dbHost,
      port: dbConfig.dbPort,
      database: dbConfig.dbName,
      schema: dbConfig.schemaName,
      useSSL: dbConfig.dbUseSSL,
    });
    processingService = processingServiceBuilder(
      dbServiceBuilder(dbInstance),
      bucketService,
      producerService,
    );
    describe("readTracingId", () => {
      it("retrieve full purpose from tracing Id", async () => {
        const message = {
          tenantId: "",
          tracingId: "",
          version: "",
          date: "",
          correlationId: "",
        };
        const result = await processingService.processTracing(message);

        expect(result).toStrictEqual({ error: false, value: {} });
      });
    });
  });
});
