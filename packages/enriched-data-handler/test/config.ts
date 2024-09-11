import { DbConfig } from "pagopa-interop-tracing-commons";
import { resolve } from "path";
import { GenericContainer } from "testcontainers";

export const TEST_POSTGRES_DB_PORT = 5432;
export const TEST_POSTGRES_DB_IMAGE = "postgres:14";

export const postgreSQLContainer = (config: DbConfig): GenericContainer => {
  return new GenericContainer(TEST_POSTGRES_DB_IMAGE)
    .withEnvironment({
      POSTGRES_DB: config.dbName,
      POSTGRES_USER: config.dbUsername,
      POSTGRES_PASSWORD: config.dbPassword,
    })
    .withCopyFilesToContainer([
      {
        source: resolve(__dirname, "init-db.sql"),
        target: "/docker-entrypoint-initdb.d/01-init.sql",
      },
    ])
    .withExposedPorts(TEST_POSTGRES_DB_PORT);
};
