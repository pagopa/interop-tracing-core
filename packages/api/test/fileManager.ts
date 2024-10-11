import { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "stream";

import { SdkStream } from "@aws-sdk/types";
import {
  ApiRecoverTracingResponse,
  ApiSubmitTracingResponse,
} from "pagopa-interop-tracing-operations-client";

export const mockBodyStream = (
  records: ApiSubmitTracingResponse[] | ApiRecoverTracingResponse[],
): GetObjectCommandOutput => {
  const csvHeaders = "date,tracingId,state,version,tenantId,errors";
  const csvRows = records
    .map(
      (record) =>
        `${record.date || ""},${record.tracingId || ""},${record.state || ""},${
          record.version || ""
        },${record.tenantId || ""},${record.errors || ""}`,
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
