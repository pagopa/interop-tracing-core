import { DB, DBContext } from "pagopa-interop-tracing-commons";
import { generateId } from "pagopa-interop-tracing-models";
import {
  TracingEnriched,
  TracingEnrichedSchema,
} from "../../models/messages.js";
import { config } from "../../utilities/config.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { batchMessages } from "../../utilities/batchHelper.js";
import {
  buildColumnSet,
  generateMergeQuery,
} from "../../utilities/sqlQueryHelper.js";

export function dbServiceBuilder(db: DB, conn: DBContext) {
  const stagingTableName = `traces_staging`;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const query = `
              CREATE TEMPORARY TABLE IF NOT EXISTS traces_staging (
                LIKE ${config.dbSchemaName}.traces
              );
            `;
        return db.query(query);
      } catch (error: unknown) {
        throw dbServiceErrorMapper("setupStagingTables", error);
      }
    },

    async insertTraces(
      tracingId: string,
      records: TracingEnriched[],
    ): Promise<{ id: string }[]> {
      try {
        const result = await db.tx(async (t) => {
          const deleteTracesQuery = `
          DELETE FROM ${config.dbSchemaName}.traces
          WHERE tracing_id = $1;
        `;
          await t.none(deleteTracesQuery, [tracingId]);

          const recordsWithIds: (TracingEnriched & { id: string })[] =
            records.map((record) => ({
              ...record,
              id: generateId(),
            }));

          const cs = buildColumnSet(conn.pgp, TracingEnrichedSchema);

          for (const batch of batchMessages(recordsWithIds, 500)) {
            await t.none(
              conn.pgp.helpers.insert(
                batch,
                cs,
                `${config.dbSchemaName}.${stagingTableName}`,
              ),
            );
          }

          const mergeQuery = generateMergeQuery(
            TracingEnrichedSchema,
            config.dbSchemaName,
            ["tracingId"],
          );
          await t.none(mergeQuery);

          await t.none(
            `TRUNCATE TABLE ${config.dbSchemaName}.${stagingTableName};`,
          );
          return recordsWithIds.map((r) => ({ id: r.id }));
        });
        return result;
      } catch (error: unknown) {
        throw dbServiceErrorMapper("insertTraces", error);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
