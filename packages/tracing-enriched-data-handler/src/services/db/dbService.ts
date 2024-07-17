import { generateId } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import { TracingEnriched } from "../../models/messages.js";
import { insertTraceError, deleteTraceError } from "../../models/errors.js";
export function dbServiceBuilder(db: DB) {
  return {
    async insertTraces(tracingId: string, records: TracingEnriched[]) {
      try {
        const queryText = `
          INSERT INTO traces.traces (
            id, tracing_id, date, purpose_id, purpose_name, status, requests_count, eservice_id,
            consumer_id, consumer_origin, consumer_name, consumer_external_id,
            producer_id, producer_name, producer_origin, producer_external_id, submitter_id, created_at
           ) 
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            ) 
            ON CONFLICT DO NOTHING
            RETURNING id;
        `;

        const insertPromises = records.map((record) => {
          const values = [
            generateId(),
            tracingId,
            record.date,
            record.purposeId,
            record.purposeName,
            record.status,
            record.requestsCount,
            record.eserviceId,
            record.consumerId,
            record.consumerOrigin,
            record.consumerName,
            record.consumerExternalId,
            record.producerId,
            record.producerName,
            record.producerOrigin,
            record.producerExternalId,
            record.submitterId,
            new Date(),
          ];
          return { query: queryText, values };
        });

        return await db.tx(async (t) => {
          const results = [];
          for (const { query, values } of insertPromises) {
            const result = await t.one<{ id: string }>(query, values);
            results.push(result);
          }
          return results;
        });
      } catch (error) {
        throw insertTraceError(
          `Error inserting trace for tracingId: ${tracingId}: Details: ${error}`,
        );
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteTracing(tracingId: string) {
      try {
        const queryText = `
          DELETE FROM traces.traces
          WHERE tracing_id = $1
          RETURNING id
        `;
        return await db.many(queryText, [tracingId]);
      } catch (error) {
        throw deleteTraceError(`Error deleteTracing: ${error}`);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
