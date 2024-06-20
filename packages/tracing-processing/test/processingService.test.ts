import { describe, expect, it } from "vitest";
import {
  ProcessingService,
  processingServiceBuilder,
} from "../src/services/processingService.js";
import { dbServiceBuilder } from "../src/services/db/dbService.js";
import { dbConfig } from "../src/utilities/dbConfig.js";
import { initDB } from "pagopa-interop-tracing-commons";
import {
  BucketService,
  bucketServiceBuilder,
} from "../src/services/bucketService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "../src/services/producerService.js";

describe("Processing Service", () => {
  let processingService: ProcessingService;
  const bucketService: BucketService = bucketServiceBuilder();
  const producerService: ProducerService = producerServiceBuilder();
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
        };
        const result = await processingService.processTracing(message);

        expect(result).toStrictEqual({ error: true, value: {} });
      });
    });
  });
});
