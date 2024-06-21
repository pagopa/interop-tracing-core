import { genericInternalError } from "pagopa-interop-tracing-models";
import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";
import {
  TracingContent,
  TracingRecordSchema,
  TracingRecords,
} from "../models/messages.js";

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  const checkRecords = (records: TracingRecords) => {
    for (const record of records) {
      const result = TracingRecordSchema.safeParse(record);

      if (!result.success) {
        const error = result.error;
        producerService.sendErrorMessage(error);
        return true;
      }
    }
    return false;
  };

  const createS3Path = (message: TracingContent) => {
    return `${message.date}/${message.tenantId}/${message.version}/${message.correlationId}/${message.tracingId}.csv`;
  };

  return {
    async processTracing(
      message: TracingContent,
    ): Promise<{ error: boolean; value: object }> {
      const s3KeyPath = createS3Path(message);
      const records = await bucketService.readObject(s3KeyPath);
      const tracingId = message.tracingId;

      const hasError = checkRecords(records);

      if (hasError)
        throw genericInternalError(
          `Formal check error for tracing id: ${tracingId}`,
        );

      const enrichedPurposes = await dbService.getEnrichedPurpose(records);

      await bucketService.writeObject(enrichedPurposes, s3KeyPath);

      return Promise.resolve({ error: false, value: {} });
    },
  };
};

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
