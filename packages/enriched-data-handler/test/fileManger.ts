import { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "stream";

import { SdkStream } from "@aws-sdk/types";
import { TracingEnriched } from "../src/models/messages.js";

export const mockBodyStream = (
  records: TracingEnriched[],
): GetObjectCommandOutput => {
  const csvHeaders =
    "submitterId,date,purposeId,purposeName,status,requestsCount,eserviceId,consumerId,consumerOrigin,consumerName,consumerExternalId,producerId,producerName,producerOrigin,producerExternalId";
  const csvRows = records
    .map(
      (record) =>
        `${record.submitterId},${record.date},${record.purposeId},${record.purposeName},${record.status},${record.requestsCount},${record.eserviceId},${record.consumerId},${record.consumerOrigin},${record.consumerName},${record.consumerExternalId},${record.producerId},${record.producerName},${record.producerOrigin},${record.producerExternalId}`,
    )
    .join("\n");

  const mockCsvData = `${csvHeaders}\n${csvRows}`;

  const readable = new Readable();
  readable._read = () => {};
  readable.push(mockCsvData);
  readable.push(null);
  return {
    $metadata: {
      httpStatusCode: 200,
    },
    Body: readable as SdkStream<Readable>,
    ContentLength: mockCsvData.length,
    ContentType: "text/csv",
  };
};
