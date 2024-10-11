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
        `${record.date},${record.purposeId || record.purposeId},${
          record.status || ""
        },${record.requestsCount || ""},`,
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
