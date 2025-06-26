import { DBContext } from "pagopa-interop-tracing-commons";
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
  deleteTargetTable,
  generateMergeQuery,
} from "../../utilities/sqlQueryHelper.js";
import { TracingTable } from "../db/traces.js";

export function dbServiceBuilder(db: DBContext) {
  const targetTableName = TracingTable.Traces;
  const stagingTableName = `${targetTableName}_${config.mergeTableSuffix}`;

  return {
    async setupStagingTables(): Promise<void> {
      try {
        const query = `
              CREATE TEMPORARY TABLE IF NOT EXISTS ${stagingTableName} (
                LIKE ${config.dbSchemaName}.${targetTableName}
              );
            `;
        return db.conn.query(query);
      } catch (error: unknown) {
        throw dbServiceErrorMapper("setupStagingTables", error);
      }
    },

    async insertTraces(tracingId: string, records: TracingEnriched[]) {
      try {
        await db.conn.tx(async (t) => {
          await deleteTargetTable(
            t,
            targetTableName,
            tracingId,
            "tracingId",
            TracingEnrichedSchema,
          );

          const traces: TracingEnrichedSchema[] = records.map((record) => ({
            ...record,
            tracingId,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }));

          const cs = buildColumnSet(
            db.pgp,
            targetTableName,
            TracingEnrichedSchema,
          );

          for (const batch of batchMessages(
            traces,
            config.dbMessagesToInsertPerBatch,
          )) {
            await t.none(db.pgp.helpers.insert(batch, cs, stagingTableName));
          }

          const mergeQuery = generateMergeQuery(
            TracingEnrichedSchema,
            config.dbSchemaName,
            ["tracingId"],
            targetTableName,
          );

          await t.none(mergeQuery);

          await t.none(`TRUNCATE TABLE ${stagingTableName};`);
        });
      } catch (error: unknown) {
        throw dbServiceErrorMapper("insertTraces", error);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
