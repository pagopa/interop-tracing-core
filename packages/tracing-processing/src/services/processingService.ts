import {
  SavePurposeErrorDto,
  genericInternalError,
} from "pagopa-interop-tracing-models";
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
      //formal check
      records: TracingRecords,
      tracing: TracingContent,
    ): Promise<SavePurposeErrorDto[]> {
      let errorsRecord = [];
      for (const record of records) {
        const result = TracingRecordSchema.safeParse(record);

        if (result.error) {
          errorsRecord.push({
            tracingId: tracing.tracingId,
            version: tracing.version,
            date: tracing.date,
            errorCode: "INVALID_FORMAL_CHECK",
            purposeId: record.purpose_id,
            message: result.error.message,
            rowNumber: record.rowNumber,
            updateTracingState: false,
          });
        }
      }
      return errorsRecord;
    },

    createS3Path(message: TracingContent) {
      return `${message.tenantId}/${message.date}/${message.tracingId}/${message.version}/${message.correlationId}/${message.tracingId}.csv`;
    },

    async processTracing(message: TracingContent) {
      try {
        const { data: tracing, error: tracingError } =
          TracingContent.safeParse(message);

        if (tracingError) {
          throw genericInternalError(
            `tracing message is not valid: ${JSON.stringify(tracingError)}`,
          );
        }
        const s3KeyPath = this.createS3Path(tracing);
        const records = await bucketService.readObject(s3KeyPath);

        if (!records || records.length === 0) {
          logger.error(`No record found for key ${s3KeyPath}`);
          return;
        }

        const errorRecords = await this.checkRecords(records, tracing);

        if (errorRecords.length) {
          logger.error(
            `Formal check error for tracing id: ${tracing.tracingId}`,
          );

          for (const [index, purposeError] of errorRecords.entries()) {
            const isLast = index === errorRecords.length - 1;
            if (isLast) {
              purposeError.updateTracingState = true;
            }

            producerService.sendErrorMessage(purposeError);
          }
          return;
        }

        const enrichedPurposes = await dbService.getEnrichedPurpose(records);
        const errorPurposes = enrichedPurposes.filter(
          (enrichedPurpose) => enrichedPurpose.error,
        );
        if (errorPurposes.length === 0) {
          await bucketService.writeObject(enrichedPurposes, s3KeyPath);
        } else {
          producerService.handleMissingPurposes(errorPurposes, tracing);
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
