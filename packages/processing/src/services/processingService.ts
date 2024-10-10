import {
  SavePurposeErrorDto,
  TracingFromS3KeyPathDto,
  genericInternalError,
} from "pagopa-interop-tracing-models";

import { FileManager } from "../../../commons/src/file-manager/fileManager.js";
import { generateCSV, parseCSV } from "../utilities/csvHandler.js";
import { DBService } from "./enricherService.js";
import { ProducerService } from "./producerService.js";
import {
  AppContext,
  PurposeErrorCodes,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { match } from "ts-pattern";
import { TracingRecordSchema } from "../models/db.js";
import {
  EnrichedPurposeArray,
  PurposeErrorMessage,
  PurposeErrorMessageArray,
} from "../models/csv.js";
import { processTracingError } from "../models/errors.js";
import { ZodIssue } from "zod";
import { Readable } from "stream";

export const processingServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager,
  producerService: ProducerService,
) => {
  return {
    async processTracing(
      tracing: TracingFromS3KeyPathDto,
      ctx: WithSQSMessageId<AppContext>,
    ) {
      try {
        logger(ctx).info(
          `Reading and processing file for tracingId: ${tracing.tracingId}`,
        );

        const bucketS3Key = fileManager.buildS3Key(
          tracing.tenantId,
          tracing.date,
          tracing.tracingId,
          tracing.version,
          tracing.correlationId
        );

        let enrichedDataObject = await fileManager.readObject(bucketS3Key);
        const tracingRecords: TracingRecordSchema[] = await parseCSV(
          enrichedDataObject.Body as Readable,
        );
        if (!tracingRecords || tracingRecords.length === 0) {
          throw new Error(`No record found for key ${bucketS3Key}`);
        }

        const hasSemiColonSeparator = tracingRecords.some((trace) => {
          return JSON.stringify(Object.keys(trace)).includes(";");
        });

        if (hasSemiColonSeparator) {
          throw new Error(`Invalid delimiter found on csv at ${bucketS3Key}`);
        }

        const formalErrorsRecords = await checkRecords(tracingRecords, tracing);

        await writeEnrichedTracingOrSendPurposeErrors(
          fileManager,
          producerService,
          dbService,
          tracingRecords,
          bucketS3Key,
          tracing,
          formalErrorsRecords,
          ctx,
        );
      } catch (error: unknown) {
        throw processTracingError(
          `Error processing tracing for tracingId: ${tracing.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export async function writeEnrichedTracingOrSendPurposeErrors(
  fileManager: FileManager,
  producerService: ProducerService,
  dbService: DBService,
  tracingRecords: TracingRecordSchema[],
  bucketS3Key: string,
  tracing: TracingFromS3KeyPathDto,
  formalErrors: PurposeErrorMessage[],
  ctx: WithSQSMessageId<AppContext>,
) {
  let enrichedPurposes = [];
  enrichedPurposes = await dbService.getEnrichedPurpose(
    tracingRecords.filter(
      (el) =>
        !formalErrors.find(
          (purpose) =>
            el.rowNumber === purpose.rowNumber &&
            purpose.errorCode === PurposeErrorCodes.INVALID_PURPOSE,
        ),
    ),
    tracing,
    ctx,
  );

  const purposeErrors: PurposeErrorMessageArray = formalErrors;

  enrichedPurposes.forEach((item) => {
    const purposeError = PurposeErrorMessageArray.safeParse(item).data;
    if (purposeError) {
      purposeErrors.push(...purposeError);
    }
  });

  if (purposeErrors && purposeErrors.length > 0) {
    await sendPurposeErrors(purposeErrors, tracing, producerService, ctx);
  } else {
    const purposeEnriched = EnrichedPurposeArray.safeParse(enrichedPurposes);

    if (purposeEnriched.error) {
      throw genericInternalError(
        `Error processing enriched purpose ${purposeEnriched.error.message}`,
      );
    }

    if (purposeEnriched.data) {
      const csvData = generateCSV( purposeEnriched.data, tracing.tenantId );
      const input = Buffer.from(csvData);
      await fileManager.writeObject(input, bucketS3Key);
    }
  }
}

export async function checkRecords(
  records: TracingRecordSchema[],
  tracing: TracingFromS3KeyPathDto,
): Promise<SavePurposeErrorDto[]> {
  const errorsRecord: SavePurposeErrorDto[] = [];

  for (const record of records) {
    const result = TracingRecordSchema.safeParse(record);
    if (result.error) {
      for (const issue of result.error.issues) {
        const parsedError = parseErrorMessage(issue);
        errorsRecord.push({
          tracingId: tracing.tracingId,
          version: tracing.version,
          errorCode: parsedError.errorCode,
          purposeId: record.purpose_id,
          message: parsedError.message,
          rowNumber: record.rowNumber,
          updateTracingState: false,
        });
      }
    }

    if (record.date !== tracing.date) {
      errorsRecord.push({
        tracingId: tracing.tracingId,
        version: tracing.version,
        errorCode: PurposeErrorCodes.INVALID_DATE,
        purposeId: record.purpose_id,
        message: `date: Date field (${record.date}) in csv is different from tracing date (${tracing.date}).`,
        rowNumber: record.rowNumber,
        updateTracingState: false,
      });
    }

    const duplicateRecords = getDuplicatePurposesRow(record, records);
    if (duplicateRecords) {
      errorsRecord.push({
        tracingId: tracing.tracingId,
        version: tracing.version,
        purposeId: record.purpose_id,
        errorCode: PurposeErrorCodes.PURPOSE_AND_STATUS_NOT_UNIQUE,
        message: `status: Duplicate status found. The current row number ${record.rowNumber} with status ${record.status} has already delcared at rows: ${duplicateRecords}.`,
        rowNumber: record.rowNumber,
        updateTracingState: false,
      });
    }
  }

  return errorsRecord;
}

function parseErrorMessage(issue: ZodIssue) {
  const errorCode = match(issue.path[0])
    .with("status", () => PurposeErrorCodes.INVALID_STATUS_CODE)
    .with("purpose_id", () => PurposeErrorCodes.INVALID_PURPOSE)
    .with("date", () => PurposeErrorCodes.INVALID_DATE)
    .with("requests_count", () => PurposeErrorCodes.INVALID_REQUEST_COUNT)
    .otherwise(() => PurposeErrorCodes.INVALID_ROW_SCHEMA);

  return { message: `${issue.path[0]}: ${issue.message}`, errorCode };
}

async function sendPurposeErrors(
  purposeErrors: PurposeErrorMessage[],
  tracing: TracingFromS3KeyPathDto,
  producerService: ProducerService,
  ctx: WithSQSMessageId<AppContext>,
) {
  const sortedPurposeErrors = purposeErrors.sort(
    (a, b) => a.rowNumber - b.rowNumber,
  );

  const errorMessagePromises = sortedPurposeErrors.map((record, index) => {
    const purposeError = {
      tracingId: tracing.tracingId,
      version: tracing.version,
      errorCode: record.errorCode,
      purposeId: record.purposeId,
      message: record.message,
      rowNumber: record.rowNumber,
      updateTracingState: index === purposeErrors.length - 1,
    };
    return producerService.sendErrorMessage(purposeError, ctx);
  });
  await Promise.all(errorMessagePromises);
}

function getDuplicatePurposesRow(
  record: TracingRecordSchema,
  records: TracingRecordSchema[],
): string | null {
  const duplicateRecords = records
    .filter(
      (r) => r.purpose_id === record.purpose_id && r.status === record.status,
    )
    .map((el) => el.rowNumber);

  return duplicateRecords.length > 1 ? `${duplicateRecords.join(",")}` : null;
}

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
