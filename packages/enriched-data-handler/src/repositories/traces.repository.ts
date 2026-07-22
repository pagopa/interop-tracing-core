import type { DBConnection, DBContext } from "pagopa-interop-tracing-commons";
import {
  enrichedCsvBaseColumnOrder,
  enrichedCsvColumnOrder,
  generateId,
} from "pagopa-interop-tracing-models";

import type { ITask } from "pg-promise";
import {
  type TracingEnriched,
  TracingEnrichedSchema,
  TracingEnrichedSchemaWithDomainIds,
} from "../models/messages.js";
import { TracingTable } from "../models/traces.js";
import { config } from "../utilities/config.js";
import {
  buildColumnSet,
  deleteTargetTable,
  generateCopyFromS3Query,
  generateMergeQuery,
} from "../utilities/sqlQueryHelper.js";

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
          id: record.id ?? generateId(),
        };

        return config.enrichTracesWithConsumerProducerEservice
          ? {
              ...base,
              consumerId: record.consumerId,
              producerId: record.producerId,
              eserviceId: record.eserviceId,
              purposeName: record.purposeName,
              consumerOrigin: record.consumerOrigin,
              consumerName: record.consumerName,
              consumerExternalId: record.consumerExternalId,
              producerOrigin: record.producerOrigin,
              producerName: record.producerName,
              producerExternalId: record.producerExternalId,
            }
          : base;
      });

      const cs = buildColumnSet(db.pgp, targetTableName, activeSchema);
      await conn.none(db.pgp.helpers.insert(traces, cs, stagingTableName));
    },

    async copyTracesToStaging(conn: DBConnection, s3Uri: string) {
      // Enforced at startup by the config schema (superRefine) when DB_INGEST_MODE=COPY.
      // This guard only narrows the optional type for TS (non-null assertions are
      // disallowed by eslint); in practice it can never trigger at runtime.
      if (!config.redshiftCopyIamRoleArn) {
        throw new Error(
          "REDSHIFT_COPY_IAM_ROLE_ARN is required for COPY ingestion mode.",
        );
      }

      const copyColumnOrder = config.enrichTracesWithConsumerProducerEservice
        ? enrichedCsvColumnOrder
        : enrichedCsvBaseColumnOrder;

      const copyQuery = generateCopyFromS3Query(
        copyColumnOrder,
        targetTableName,
        s3Uri,
        config.redshiftCopyIamRoleArn,
      );

      await conn.none(copyQuery);
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
