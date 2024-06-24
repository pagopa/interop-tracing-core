import { genericInternalError } from "pagopa-interop-tracing-models";
import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";
import {
  TracingContent,
  TracingRecordSchema,
  TracingRecords,
} from "../models/messages.js";
import { logger } from "pagopa-interop-tracing-commons";

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  return {
    async checkRecords(
      records: TracingRecords,
      tracingId: string,
      correlationId: string,
    ) {
      for (const record of records) {
        const result = TracingRecordSchema.safeParse(record);

        if (!result.success) {
          const error = result.error;
          await producerService.sendErrorMessage(
            error.message,
            tracingId,
            record.purpose_id,
            correlationId,
          );
          return true;
        }
      }
      return false;
    },

    createS3Path(message: TracingContent) {
      return `${message.tenantId}/${message.date}/${message.tracingId}/${message.version}/${message.correlationId}/${message.tracingId}.csv`;
    },

    async processTracing(message: TracingContent) {
      try {
        const tracingMessage = TracingContent.safeParse(message);
        if (tracingMessage.error) {
          throw genericInternalError(
            `tracing message is not valid: ${JSON.stringify(tracingMessage.error)}`,
          );
        }
        const s3KeyPath = this.createS3Path(tracingMessage.data);
        const records = await bucketService.readObject(s3KeyPath);

        if (!records || records.length === 0) {
          logger.error(`No record found for key ${s3KeyPath}`);
          return;
        }

        const { tracingId, correlationId } = tracingMessage.data;

        const hasError = await this.checkRecords(
          records,
          tracingId,
          correlationId,
        );

        if (hasError) {
          logger.error(`Formal check error for tracing id: ${tracingId}`);
          return;
        }

        const enrichedPurposes = await dbService.getEnrichedPurpose(records);
        const errorPurposes = enrichedPurposes.filter(
          (enrichedPurpose) => enrichedPurpose.error,
        );
        if (errorPurposes.length === 0) {
          await bucketService.writeObject(enrichedPurposes, s3KeyPath);
        } else {
          producerService.handleMissingPurposes(
            errorPurposes,
            tracingId,
            correlationId,
          );
        }
      } catch (e) {
        throw genericInternalError(
          `Error for tracing id: ${message.tracingId}, ${JSON.stringify(e)}`,
        );
      }
    },
  };
};

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
