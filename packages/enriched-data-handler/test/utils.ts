import { DB } from "pagopa-interop-tracing-commons";
import { TracingEnriched } from "../src/models/messages.js";
import { generateId } from "pagopa-interop-tracing-models";
import { config } from "../src/utilities/config.js";

export async function addTraces(
  tracingId: string,
  records: TracingEnriched[],
  db: DB,
) {
  const insertQuery = `
  INSERT INTO ${config.dbSchemaName}.traces (
    id, tracing_id, date, purpose_id, purpose_name, status, requests_count, eservice_id,
    consumer_id, consumer_origin, consumer_name, consumer_external_id,
    producer_id, producer_name, producer_origin, producer_external_id, submitter_id, created_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18
  )
   RETURNING tracing_id
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
    return { query: insertQuery, values };
  });

  return await db.tx(async (t) => {
    const results = [];
    for (const { query, values } of insertPromises) {
      const result = await t.one<{ id: string }>(query, values);
      results.push(result);
    }
    return results;
  });
}
