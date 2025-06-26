import { Readable } from "stream";
import { TracingEnriched } from "../src/models/messages.js";

export const mockBodyStream = (records: TracingEnriched[]): Readable => {
  const csvHeaders = "submitterId,date,purposeId,status,requestsCount";
  const mockCsvData = [
    csvHeaders,
    ...records.map(
      (record) =>
        `${record.submitterId},${record.date},${record.purposeId},${record.status},${record.requestsCount}`,
    ),
  ].join("\n");

  return Readable.from([mockCsvData]);
};
