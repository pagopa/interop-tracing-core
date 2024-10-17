import { Readable } from "stream";
import { TracingRecordSchema } from "../src/models/db.js";

export const mockBodyStream = (records: TracingRecordSchema[]): Readable => {
  const csvHeaders = "date,purpose_id,status,requests_count,rowNumber";
  const mockCsvData = [
    csvHeaders,
    ...records.map(
      (record) =>
        `${record.date},${record.purpose_id},${record.status},${record.requests_count},${record.rowNumber}`,
    ),
  ].join("\n");

  return Readable.from([mockCsvData]);
};
