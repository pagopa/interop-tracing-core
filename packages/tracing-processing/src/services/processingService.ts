import {
  SavePurposeErrorDto,
  TracingFromS3KeyPathDto,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { BucketService } from "./bucketService.js";
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

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
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

        const s3KeyPath = createS3Path(tracing);

        const tracingRecords = await bucketService.readObject(s3KeyPath);
        if (!tracingRecords || tracingRecords.length === 0) {
          throw new Error(`No record found for key ${s3KeyPath}`);
        }

        const hasSemiColonSeparator = tracingRecords.some((trace) => {
          return JSON.stringify(Object.keys(trace)).includes(";");
        });

        if (hasSemiColonSeparator) {
          throw new Error(`Invalid delimiter found on csv at ${s3KeyPath}`);
        }

        const formalErrorsRecords = await checkRecords(tracingRecords, tracing);

        await writeEnrichedTracingOrSendPurposeErrors(
          bucketService,
          producerService,
          dbService,
          tracingRecords,
          s3KeyPath,
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
  bucketService: BucketService,
  producerService: ProducerService,
  dbService: DBService,
  tracingRecords: TracingRecordSchema[],
  s3KeyPath: string,
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
      await bucketService.writeObject(
        purposeEnriched.data,
        s3KeyPath,
        tracing.tenantId,
        ctx,
      );
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
      const parsedError = parseErrorMessage(result.error.message);

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

    if (result.data && result.data.date !== tracing.date) {
      errorsRecord.push({
        tracingId: tracing.tracingId,
        version: tracing.version,
        errorCode: PurposeErrorCodes.INVALID_DATE,
        purposeId: record.purpose_id,
        message: `Date ${result.data?.date} on csv is different from tracing date ${tracing.date}`,
        rowNumber: record.rowNumber,
        updateTracingState: false,
      });
    }
  }

  return errorsRecord;
}

function parseErrorMessage(errorObj: string) {
  const error = JSON.parse(errorObj);
  const {
    path,
    message,
  }: { path: (keyof TracingRecordSchema)[]; message: string } = error[0];
  const errorCode = match(path[0])
    .with("status", () => PurposeErrorCodes.INVALID_STATUS_CODE)
    .with("purpose_id", () => PurposeErrorCodes.INVALID_PURPOSE)
    .with("date", () => PurposeErrorCodes.INVALID_DATE)
    .with("requests_count", () => PurposeErrorCodes.INVALID_REQUEST_COUNT)
    .otherwise(() => PurposeErrorCodes.INVALID_ROW_SCHEMA);

  return { message: `${path}: ${message}`, errorCode };
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

export function createS3Path(message: TracingFromS3KeyPathDto) {
  return `tenantId=${message.tenantId}/date=${message.date}/tracingId=${message.tracingId}/version=${message.version}/correlationId=${message.correlationId}/${message.tracingId}.csv`;
}

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
