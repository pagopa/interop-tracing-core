import { DB, getCopyClient } from "pagopa-interop-tracing-commons";
import { from as copyFrom } from "pg-copy-streams";
import { pipeline } from "node:stream/promises";
import type { Readable, Writable } from "node:stream";
import { errorProcessingUpdateTracingState } from "../../model/domain/errors.js";
import {
  UpdateTracingStateDto,
  errorsCsvMapping,
} from "pagopa-interop-tracing-models";
import { config } from "../../utilities/config.js";

export function dbServiceBuilder(db: DB) {
  return {
    async updateTracingState(data: UpdateTracingStateDto): Promise<void> {
      try {
        const updateTracingStateQuery = `
          UPDATE ${config.dbSchemaName}.tracings
            SET state = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id`;

        await db.one(updateTracingStateQuery, [data.state, data.tracingId]);
      } catch (error: unknown) {
        throw errorProcessingUpdateTracingState(
          `Error updating tracingId: ${data.tracingId}, version: ${data.version}. Details: ${error}`,
        );
      }
    },

    async copyPurposeErrorsFromStream(stream: Readable): Promise<void> {
      const purposeErrorCsvColumns = Object.keys(errorsCsvMapping);
      const table = `${config.dbSchemaName}.purposes_errors`;
      const columns = purposeErrorCsvColumns.join(",");
      const copyQuery = `COPY ${table} (${columns}) FROM STDIN WITH (FORMAT csv, HEADER true)`;

      await copyFromStream(copyQuery, stream);
    },
  };

  async function copyFromStream(
    copyQuery: string,
    source: Readable,
  ): Promise<void> {
    const connection = await db.connect();
    try {
      const client = getCopyClient(connection);
      const copyStream = client.query(copyFrom(copyQuery)) as Writable;

      await pipeline(source, copyStream);
    } finally {
      connection.done();
    }
  }
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
