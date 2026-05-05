import { DB, getCopyClient } from "pagopa-interop-tracing-commons";
import { from as copyFrom } from "pg-copy-streams";
import { pipeline } from "node:stream/promises";
import type { Readable, Writable } from "node:stream";
import {
  UpdateTracingStateDto,
  errorsCsvMapping,
} from "pagopa-interop-tracing-models";
import { config } from "../../utilities/config.js";

export function dbServiceBuilder(db: DB) {
  return {
    async updateTracingState(data: UpdateTracingStateDto): Promise<void> {
      const updateTracingStateQuery = `
          UPDATE ${config.dbSchemaName}.tracings
            SET state = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id`;

      await db.one(updateTracingStateQuery, [data.state, data.tracingId]);
    },

    async copyPurposeErrorsFromStream(
      stream: Readable,
      tracingId: string,
      version: number,
    ): Promise<void> {
      const purposeErrorCsvColumns = Object.keys(errorsCsvMapping);
      const table = `${config.dbSchemaName}.purposes_errors`;
      const columns = purposeErrorCsvColumns.join(",");
      // Keep empty CSV fields as empty strings (not NULL) to satisfy NOT NULL columns.
      const copyQuery = `COPY ${table} (${columns}) FROM STDIN WITH (FORMAT csv, HEADER true, NULL '\\\\N')`;

      const deleteQuery = `
        DELETE FROM ${config.dbSchemaName}.purposes_errors
        WHERE tracing_id = $1 AND version = $2
      `;

      await copyFromStream(copyQuery, stream, deleteQuery, [
        tracingId,
        version,
      ]);
    },
  };

  async function copyFromStream(
    copyQuery: string,
    source: Readable,
    deleteQuery: string,
    deleteParams: [string, number],
  ): Promise<void> {
    const connection = await db.connect();
    try {
      await connection.none("BEGIN");
      await connection.none(deleteQuery, deleteParams);

      const client = getCopyClient(connection);
      const copyStream = client.query(copyFrom(copyQuery)) as Writable;

      await pipeline(source, copyStream);
      await connection.none("COMMIT");
    } catch (error: unknown) {
      await connection.none("ROLLBACK");
      throw error;
    } finally {
      connection.done();
    }
  }
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
