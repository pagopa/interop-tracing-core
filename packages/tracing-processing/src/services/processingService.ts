import {
  SavePurposeErrorDto,
  TracingFromS3KeyPathDto,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { BucketService } from "./bucketService.js";
import { DBService } from "./enricherService.js";
import { ProducerService } from "./producerService.js";
import {
  PurposeErrorCodes,
  genericLogger,
} from "pagopa-interop-tracing-commons";
import { match } from "ts-pattern";
import { errorMapper } from "../utilities/errorMapper.js";
import { TracingRecordSchema } from "../models/db.js";
import {
  EnrichedPurposeArray,
  PurposeErrorMessage,
  PurposeErrorMessageArray,
} from "../models/csv.js";

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  return {
    async processTracing(tracing: TracingFromS3KeyPathDto) {
      try {
        genericLogger.info(
          `Reading and processing file for tracingId: ${tracing.tracingId}`,
        );

        const s3KeyPath = createS3Path(tracing);

        const tracingRecords = await bucketService.readObject(s3KeyPath);
        if (!tracingRecords || tracingRecords.length === 0) {
          throw `No record found for key ${s3KeyPath}`;
        }

        const hasSemiColonSeparator = tracingRecords.some((trace) => {
          return JSON.stringify(Object.keys(trace)).includes(";");
        });

        if (hasSemiColonSeparator) {
          throw `Invalid delimiter found on csv at ${s3KeyPath}`;
        }

        const formalErrorsRecords = await checkRecords(tracingRecords, tracing);

        writeEnrichedTracingOrSendPurposeErrors(
          bucketService,
          producerService,
          dbService,
          tracingRecords,
          s3KeyPath,
          tracing,
          formalErrorsRecords,
        );
      } catch (error) {
        throw errorMapper(error);
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
) {
  const enrichedPurposes = await dbService.getEnrichedPurpose(
    tracingRecords,
    tracing,
  );

  const purposeErrors: PurposeErrorMessageArray = formalErrors;

  enrichedPurposes.forEach((item) => {
    const purposeError = PurposeErrorMessageArray.safeParse(item).data;
    if (purposeError) {
      purposeErrors.push(...purposeError);
    }
  });

  if (purposeErrors && purposeErrors.length > 0) {
    await sendPurposeErrors(purposeErrors, tracing, producerService);
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
    return producerService.sendErrorMessage(purposeError);
  });
  await Promise.all(errorMessagePromises);
}

export function createS3Path(message: TracingFromS3KeyPathDto) {
  return `tenantId=${message.tenantId}/date=${message.date}/tracingId=${message.tracingId}/version=${message.version}/correlationId=${message.correlationId}/${message.tracingId}.csv`;
}

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
