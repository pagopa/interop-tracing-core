import {
  SavePurposeErrorDto,
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
import { TracingFromS3Path } from "../models/tracing.js";

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  return {
    async processTracing(message: TracingFromS3Path) {
      try {
        const { data: tracing, error: tracingError } =
          TracingFromS3Path.safeParse(message);

        if (tracingError) {
          throw `Tracing message is not valid: ${JSON.stringify(tracingError)}`;
        }

        genericLogger.info(`Processing tracing id: ${tracing.tracingId}`);

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

        if (formalErrorsRecords.length) {
          sendFormalErrors(formalErrorsRecords, producerService);
        } else {
          writeEnrichedTracingOrSendPurposeErrors(
            bucketService,
            producerService,
            dbService,
            tracingRecords,
            s3KeyPath,
            tracing,
          );
        }
      } catch (error) {
        throw errorMapper(error);
      }
    },
  };
};

function sendFormalErrors(
  formalErrorsRecords: SavePurposeErrorDto[],
  producerService: ProducerService,
) {
  for (const [index, purposeError] of formalErrorsRecords.entries()) {
    const isLast = index === formalErrorsRecords.length - 1;
    if (isLast) {
      purposeError.updateTracingState = true;
    }
    producerService.sendErrorMessage(purposeError);
  }
}

export async function writeEnrichedTracingOrSendPurposeErrors(
  bucketService: BucketService,
  producerService: ProducerService,
  dbService: DBService,
  tracingRecords: TracingRecordSchema[],
  s3KeyPath: string,
  tracing: TracingFromS3Path,
) {
  const enrichedPurposes = await dbService.getEnrichedPurpose(
    tracingRecords,
    tracing,
  );

  const purposeErrorsFiltered = enrichedPurposes.filter((item) => {
    if (PurposeErrorMessage.safeParse(item).success) {
      return item;
    } else {
      return null;
    }
  });

  const { data: purposeErrors } = PurposeErrorMessageArray.safeParse(
    purposeErrorsFiltered,
  );

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
  tracing: TracingFromS3Path,
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
        errorCode: parsedError.errorCode,
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
    received,
  }: { path: (keyof TracingRecordSchema)[]; received: string } = error[0];
  const errorCode = match(path[0])
    .with("status", () => PurposeErrorCodes.INVALID_STATUS_CODE)
    .with("purpose_id", () => PurposeErrorCodes.INVALID_PURPOSE)
    .with("date", () => PurposeErrorCodes.INVALID_DATE)
    .with("requests_count", () => PurposeErrorCodes.INVALID_REQUEST_COUNT)
    .otherwise(() => PurposeErrorCodes.INVALID_ROW_SCHEMA);

  return { message: `{ ${path}: ${received} } is not valid`, errorCode };
}

async function sendPurposeErrors(
  purposeErrors: PurposeErrorMessage[],
  tracing: TracingFromS3Path,
  producerService: ProducerService,
) {
  const errorMessagePromises = purposeErrors.map((record, index) => {
    const purposeError = {
      tracingId: tracing.tracingId,
      version: tracing.version,
      date: tracing.date,
      errorCode: record.errorCode,
      status: record.status,
      purposeId: record.purposeId,
      message: record.message,
      rowNumber: record.rowNumber,
      updateTracingState: index === purposeErrors.length - 1,
    };
    return producerService.sendErrorMessage(purposeError);
  });
  await Promise.all(errorMessagePromises);
}

export function createS3Path(message: TracingFromS3Path) {
  return `tenantId=${message.tenantId}/date=${message.date}/tracingId=${message.tracingId}/version=${message.version}/correlationId=${message.correlationId}/${message.tracingId}.csv`;
}

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
