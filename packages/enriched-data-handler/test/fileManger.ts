import { Readable } from "stream";
import { TracingEnriched } from "../src/models/messages.js";

export const mockBodyStream = (records: TracingEnriched[]): Readable => {
  const csvHeaders =
    "submitterId,date,purposeId,purposeName,status,requestsCount,eserviceId,consumerId,consumerOrigin,consumerName,consumerExternalId,producerId,producerName,producerOrigin,producerExternalId";
  const mockCsvData = [
    csvHeaders,
    ...records.map(
      (record) =>
        `${record.submitterId},${record.date},${record.purposeId},${record.purposeName},${record.status},${record.requestsCount},${record.eserviceId},${record.consumerId},${record.consumerOrigin},${record.consumerName},${record.consumerExternalId},${record.producerId},${record.producerName},${record.producerOrigin},${record.producerExternalId}`,
    ),
  ].join("\n");

  return Readable.from([mockCsvData]);
};
