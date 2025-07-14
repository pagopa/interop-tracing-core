import { DBContext } from "pagopa-interop-tracing-commons";
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
    async insertToStaging(
      tx: ITask<unknown>,
      tracingId: string,
      records: TracingEnriched[],
    ) {
      await deleteTargetTable(
        tx,
        targetTableName,
        tracingId,
        "tracingId",
        TracingEnrichedSchema,
      );

      const traces: TracingEnrichedSchema[] = records.map((record) => ({
        ...record,
        tracingId,
        id: generateId(),
      }));

      const cs = buildColumnSet(db.pgp, targetTableName, TracingEnrichedSchema);
      await tx.none(db.pgp.helpers.insert(traces, cs, stagingTableName));
    },

    async mergeTraces(tx: ITask<unknown>) {
      const mergeQuery = generateMergeQuery(
        TracingEnrichedSchema,
        config.dbSchemaName,
        ["tracingId"],
        targetTableName,
      );
      await tx.none(mergeQuery);
    },

    async cleanTraces(tx: ITask<unknown>) {
      await tx.none(`TRUNCATE TABLE ${stagingTableName};`);
    },
  };
}

export type TracesRepository = ReturnType<typeof tracesRepository>;
