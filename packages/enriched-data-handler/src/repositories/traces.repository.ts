import { DBConnection, DBContext } from "pagopa-interop-tracing-commons";
import { generateId } from "pagopa-interop-tracing-models";

import { ITask } from "pg-promise";
import { TracingEnriched, TracingEnrichedSchema } from "../models/messages.js";
import { TracingTable } from "../models/traces.js";
import {
  deleteTargetTable,
  buildColumnSet,
  generateMergeQuery,
} from "../utilities/sqlQueryHelper.js";
import { config } from "../utilities/config.js";

export function tracesRepository(db: DBContext) {
  const targetTableName = TracingTable.Traces;
  const stagingTableName = `${targetTableName}_${config.mergeTableSuffix}`;

  return {
    async insertTracesToStaging(
      conn: DBConnection,
      tracingId: string,
      records: TracingEnriched[],
    ) {
      const traces: TracingEnrichedSchema[] = records.map((record) => ({
        ...record,
        tracingId,
        id: generateId(),
      }));

      const cs = buildColumnSet(db.pgp, targetTableName, TracingEnrichedSchema);
      await conn.none(db.pgp.helpers.insert(traces, cs, stagingTableName));
    },

    async deleteOldTracesFromTarget(tx: ITask<unknown>, tracingId: string) {
      await deleteTargetTable(
        tx,
        targetTableName,
        tracingId,
        "tracingId",
        TracingEnrichedSchema,
      );
    },

    async mergeTracesToTarget(tx: ITask<unknown>) {
      const mergeQuery = generateMergeQuery(
        TracingEnrichedSchema,
        config.dbSchemaName,
        ["tracingId"],
        targetTableName,
      );
      await tx.none(mergeQuery);
    },

    async cleanStaging(tx: ITask<unknown>) {
      await tx.none(`TRUNCATE TABLE ${stagingTableName};`);
    },
  };
}

export type TracesRepository = ReturnType<typeof tracesRepository>;
