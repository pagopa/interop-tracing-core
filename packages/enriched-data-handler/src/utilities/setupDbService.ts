import { DBConnection } from "pagopa-interop-tracing-commons";
import { config } from "./config.js";

export function setupDbServiceBuilder(conn: DBConnection) {
  return {
    async setupStagingTables(tableNames: string[]): Promise<void> {
      await Promise.all(
        tableNames.map((tableName) => {
          const query = `
                CREATE TEMPORARY TABLE IF NOT EXISTS ${tableName}_${config.mergeTableSuffix} (
                  LIKE ${config.dbSchemaName}.${tableName}
                );
              `;
          return conn.query(query);
        }),
      );
    },
  };
}
