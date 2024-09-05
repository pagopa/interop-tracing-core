import { generateId } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import { TracingEnriched } from "../../models/messages.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";

export function dbServiceBuilder(db: DB) {
  return {
    async insertTraces(
      tracingId: string,
      records: TracingEnriched[],
    ): Promise<{ id: string }[]> {
      try {
        const queryText = `
          INSERT INTO traces.traces (
            id, tracing_id, date, purpose_id, purpose_name, status, requests_count, eservice_id,
            consumer_id, consumer_origin, consumer_name, consumer_external_id,
            producer_id, producer_name, producer_origin, producer_external_id, submitter_id
           ) 
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
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
        throw dbServiceErrorMapper("insertTraces", error);
      }
    },

    async deleteTraces(tracingId: string): Promise<void> {
      try {
        const deleteTracesQuery = `
          DELETE FROM traces.traces
          WHERE tracing_id = $1
          RETURNING id
        `;
        await db.manyOrNone(deleteTracesQuery, [tracingId]);
      } catch (error) {
        throw dbServiceErrorMapper("deleteTraces", error);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
