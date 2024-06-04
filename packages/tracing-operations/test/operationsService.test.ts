import { initDB } from "pagopa-interop-tracing-commons";
import { config } from "../src/utilities/config.js";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { dbServiceBuilder } from "../src/services/db/dbService.js";
import { resolve } from "path";

describe("Operations Service", () => {
  let operationsService: OperationsService;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  beforeAll(async () => {
    const postgreSqlContainer = await new PostgreSqlContainer("postgres:14")
      .withUsername(config.dbUsername)
      .withPassword(config.dbPassword)
      .withDatabase(config.dbName)
      .withExposedPorts(5432)
      .withCopyFilesToContainer([
        {
          source: resolve(__dirname, "init-db.sql"),
          target: "/docker-entrypoint-initdb.d/01-init.sql",
        },
      ])
      .start();

    config.dbPort = postgreSqlContainer.getMappedPort(5432);

    const dbInstance = initDB({
      username: config.dbUsername,
      password: config.dbPassword,
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      schema: config.schemaName,
      useSSL: config.dbUseSSL,
    });

    operationsService = operationsServiceBuilder(dbServiceBuilder(dbInstance));
  });

  describe("Tenants service", () => {
    describe("getTenantByPurposeId", () => {
      it("retrieve tenant by purposeId", async () => {
        const result = await operationsService.getTenantByPurposeId("");

        expect(result).toBe("");
      });
    });
  });
});
