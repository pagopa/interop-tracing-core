import { genericInternalError } from "pagopa-interop-tracing-models";
import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";
import { TracingContent } from "../models/messages.js";

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  const enrichFile = (records: Array<unknown>, purposes: Array<unknown>) => {
    for (const record of records) {
      console.log(record, purposes);
    }
    return records;
  };

  const checkRecords = (records: Array<unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _record of records) {
      const error = null;

      if (error) {
        producerService.sendErrorMessage(error);
      }
      return !!error;
    }
    return false;
  };

  const createS3Path = (message: TracingContent) => {
    return `${message}`;
  };

  return {
    async processTracing(
      message: TracingContent,
    ): Promise<{ error: boolean; value: object }> {
      console.log("MESSAGE PROCESS", message);
      const s3KeyPath = createS3Path(message);
      const records = await bucketService.readObject(s3KeyPath);
      const tracingId = message.tracingId;

      const hasError = checkRecords(records);

      if (hasError)
        throw genericInternalError(
          `Formal check error for tracing id: ${tracingId}`,
        );

      const purposes = await dbService.getPurposesByTracingId(tracingId);

      const enrichedTracing = enrichFile(records, purposes);

      await bucketService.writeObject(enrichedTracing);

      return Promise.resolve({ error: false, value: {} });
    },
  };
};

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
