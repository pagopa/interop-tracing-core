import {
  generateId,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import { TracingEnriched } from "../../models/messages.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async insertTracing(tracingId: string, records: TracingEnriched[]) {
      try {
        const queryText = `
          INSERT INTO traces.traces (
            id, tracing_id, date, purpose_id, purpose_name, status, requests_count, eservice_id,
            consumer_id, consumer_origin, consumer_name, consumer_external_id,
            producer_id, producer_name, producer_origin, producer_external_id, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
          RETURNING *;
        `;

        const insertPromises = records.map(async (record) => {
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
            new Date(),
          ];
          await db.any(queryText, values);
        });

        const results = await Promise.all(insertPromises);
        return results.map((result) => result);
      } catch (error) {
        throw genericInternalError(`Error insertTracing: ${error}`);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteTracing(_tracingId: string) {
      try {
        return Promise.resolve([{}]);
      } catch (error) {
        throw genericInternalError(`Error insertTracing: ${error}`);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
