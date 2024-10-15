import csv from "csv-parser";
import { Readable } from "stream";
import { TracingRecordSchema } from "../models/db.js";
import { EnrichedPurpose } from "../models/csv.js";

export async function parseCSV(
  stream: Readable,
): Promise<TracingRecordSchema[]> {
  let results: TracingRecordSchema[] = [];

  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

export function generateCSV(
  records: EnrichedPurpose[],
  tenantId: string,
): string {
  const header = [
    "tracingId",
    "submitterId",
    "date",
    "purposeId",
    "purposeName",
    "status",
    "requestsCount",
    "eserviceId",
    "consumerId",
    "consumerOrigin",
    "consumerName",
    "consumerExternalId",
    "producerId",
    "producerName",
    "producerOrigin",
    "producerExternalId",
  ].join(",");

  const rows = records
    .map((record) => {
      return [
        record.tracingId,
        tenantId,
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
      ]
        .map((field) => (field === null || field === undefined ? "" : field))
        .join(",");
    })
    .join("\n");

  return `${header}\n${rows}`;
}
