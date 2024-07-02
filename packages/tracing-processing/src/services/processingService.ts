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
import { genericLogger } from "pagopa-interop-tracing-commons";
import { match } from "ts-pattern";

function parseErrorMessage(errorObj: string) {
  const error = JSON.parse(errorObj);
  const {
    path,
    received,
  }: { path: (keyof TracingRecordSchema)[]; received: string } = error[0];
  const error_code = match(path[0])
    .with("status", () => "INVALID_STATUS_CODE")
    .with("purpose_id", () => "INVALID_PURPOSE")
    .with("date", () => "INVALID_DATE")
    .with("requests_count", () => "INVALID_REQUEST_COUNT")
    .otherwise(() => "INVALID_FORMAL_CHECK");

  return { message: `{ ${path}: ${received} } is not valid`, error_code };
}

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  return {
    async checkRecords(
      records: TracingRecords,
      tracing: TracingContent,
    ): Promise<SavePurposeErrorDto[]> {
      const errorsRecord: SavePurposeErrorDto[] = [];

      for (const record of records) {
        const result = TracingRecordSchema.safeParse(record);

        if (result.error) {
          const parsedError = parseErrorMessage(result.error.message);

          errorsRecord.push({
            tracingId: tracing.tracingId,
            version: tracing.version,
            date: tracing.date,
            status: record.status,
            errorCode: parsedError.error_code,
            purposeId: record.purpose_id,
            message: parsedError.message,
            rowNumber: record.rowNumber,
            updateTracingState: false,
          });

          continue;
        }

        if (result.data?.date !== tracing.date) {
          errorsRecord.push({
            tracingId: tracing.tracingId,
            version: tracing.version,
            date: tracing.date,
            status: record.status,
            errorCode: "DATE_NOT_VALID",
            purposeId: record.purpose_id,
            message: `Date ${result.data?.date} on csv is different from tracing date ${tracing.date}`,
            rowNumber: record.rowNumber,
            updateTracingState: false,
          });
        }
      }

      return errorsRecord;
    },

    createS3Path(message: TracingContent) {
      return `tenantId=${message.tenantId}/date=${message.date}/tracingId=${message.tracingId}/version=${message.version}/correlationId=${message.correlationId}/${message.tracingId}.csv`;
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
          genericLogger.error(`No record found for key ${s3KeyPath}`);
          return;
        }

        const errorRecords = await this.checkRecords(records, tracing);
        if (errorRecords.length) {
          genericLogger.error(
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

        const enrichedPurposes = await dbService.getEnrichedPurpose(
          records,
          tracing,
        );
        const errorPurposes = enrichedPurposes.filter(
          (enrichedPurpose) => !!enrichedPurpose.errorCode,
        );
        if (errorPurposes.length === 0) {
          await bucketService.writeObject(enrichedPurposes, s3KeyPath);
        } else {
          producerService.handleErrorPurposes(errorPurposes, tracing);
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
