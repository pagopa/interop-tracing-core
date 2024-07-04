import csv from "csv-parser";
import { Readable } from "stream";
import { TracingRecordSchema, EnrichedPurpose } from "../models/messages.js";

export async function parseCSV(
  stream: Readable,
): Promise<TracingRecordSchema[]> {
  const results: TracingRecordSchema[] = [];
  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

export function generateCSV(records: EnrichedPurpose[]): string {
  const header = [
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
        record.date,
        record.purposeId,
        record.purposeName,
        record.status,
        record.requestsCount,
        record.eservice.eserviceId,
        record.eservice.consumerId,
        record.consumerOrigin,
        record.consumerName,
        record.consumerExternalId,
        record.eservice.producerId,
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
