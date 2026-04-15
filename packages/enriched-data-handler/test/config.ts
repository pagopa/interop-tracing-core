import { TracingEnrichedDataHandlerConfig } from "../src/utilities/config.js";
import { resolve } from "path";
import { GenericContainer } from "testcontainers";

export const TEST_POSTGRES_DB_PORT = 5432;
export const TEST_POSTGRES_DB_IMAGE = "postgres:14";

export const postgreSQLContainer = (
  config: TracingEnrichedDataHandlerConfig,
): GenericContainer => {
  return new GenericContainer(TEST_POSTGRES_DB_IMAGE)
    .withEnvironment({
      POSTGRES_DB: config.analyticsDbName,
      POSTGRES_USER: config.analyticsDbUsername,
      POSTGRES_PASSWORD: config.analyticsDbPassword,
    })
    .withCopyFilesToContainer([
      {
        source: resolve(__dirname, "../../../docker/traces-db/init-db.sql"),
        target: "/docker-entrypoint-initdb.d/01-init.sql",
      },
    ])
    .withExposedPorts(TEST_POSTGRES_DB_PORT);
};
