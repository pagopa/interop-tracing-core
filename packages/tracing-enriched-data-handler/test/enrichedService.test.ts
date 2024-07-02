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
import { initDB } from "pagopa-interop-tracing-commons";

describe("Processing Service", () => {
  let enrichedService: EnrichedService;
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
    enrichedService = enrichedServiceBuilder(
      dbServiceBuilder(dbInstance),
      bucketService,
      producerService,
    );
    describe("insert tracing", () => {
      it("it should insert a tracing", async () => {
        const message = {
          tenantId: "",
          tracingId: "",
          version: "",
          date: "",
        };
        const result = await enrichedService.insertTracing(message);

        expect(result).toStrictEqual({});
      });
    });
  });
});
