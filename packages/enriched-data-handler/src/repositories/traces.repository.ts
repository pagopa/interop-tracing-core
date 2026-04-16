import { DBConnection, DBContext } from "pagopa-interop-tracing-commons";
import { generateId } from "pagopa-interop-tracing-models";

import { ITask } from "pg-promise";
import {
  TracingEnriched,
  TracingEnrichedSchema,
  TracingEnrichedSchemaWithDomainIds,
} from "../models/messages.js";
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
  const activeSchema = config.enrichTracesWithConsumerProducerEservice
    ? TracingEnrichedSchemaWithDomainIds
    : TracingEnrichedSchema;

  return {
    async insertTracesToStaging(
      conn: DBConnection,
      tracingId: string,
      records: TracingEnriched[],
    ) {
      const traces = records.map((record) => {
        const base = {
          submitterId: record.submitterId,
          date: record.date,
          purposeId: record.purposeId,
          status: record.status,
          token_id: record.token_id,
          requestsCount: record.requestsCount,
          tracingId,
          id: generateId(),
        };

        return config.enrichTracesWithConsumerProducerEservice
          ? {
              ...base,
              consumerId: record.consumerId,
              producerId: record.producerId,
              eserviceId: record.eserviceId,
            }
          : base;
      });

      const cs = buildColumnSet(db.pgp, targetTableName, activeSchema);
      await conn.none(db.pgp.helpers.insert(traces, cs, stagingTableName));
    },

    async deleteOldTracesFromTarget(tx: ITask<unknown>, tracingId: string) {
      await deleteTargetTable(
        tx,
        targetTableName,
        tracingId,
        "tracingId",
        activeSchema,
      );
    },

    async mergeTracesToTarget(tx: ITask<unknown>) {
      const mergeQuery = generateMergeQuery(
        activeSchema,
        config.analyticsDbSchemaName,
        targetTableName,
      );
      await tx.none(mergeQuery);
    },

    async cleanStaging(conn: DBConnection) {
      await conn.none(`TRUNCATE TABLE ${stagingTableName};`);
    },
  };
}

export type TracesRepository = ReturnType<typeof tracesRepository>;
