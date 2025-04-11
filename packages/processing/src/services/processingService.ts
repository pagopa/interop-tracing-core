import {
  TracingFromS3KeyPathDto,
  genericInternalError,
} from "pagopa-interop-tracing-models";

import {
  expectedHeaders,
  generateCSV,
  getPurposeError,
  parseCSV,
} from "../utilities/csvHandler.js";
import { DBService } from "./enricherService.js";
import { ProducerService } from "./producerService.js";
import {
  AppContext,
  FileManager,
  PurposeErrorCodes,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { TracingRecordSchema } from "../models/db.js";
import {
  EnrichedPurposeArray,
  PurposeErrorMessage,
  PurposeErrorMessageArray,
} from "../models/csv.js";
import { processTracingError } from "../models/errors.js";
import { config } from "../utilities/config.js";
import { checkRecords } from "../utilities/checkCSVFormalErrors.js";

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
          tracing.correlationId,
        );
        const enrichedDataObject = await fileManager.readObject(bucketS3Key);
        const csvData: TracingRecordSchema[] =
          await parseCSV(enrichedDataObject);
        const tracingRecords = csvData.map((csv, index) => {
          return { ...csv, rowNumber: index + 1 };
        });
        if (!tracingRecords || tracingRecords.length === 0) {
          const csvData = generateCSV([], tracing.tenantId);
          const input = Buffer.from(csvData);
          await fileManager.writeObject(
            input,
            "text/csv",
            bucketS3Key,
            config.bucketEnrichedS3Name,
          );
          return;
        }

        const actualHeaders = Object.keys(tracingRecords[0]);
        if (expectedHeaders.join(",") !== actualHeaders.sort().join(",")) {
          const errorMessage = `CSV headers invalid. Expected [${expectedHeaders.join(
            ",",
          )}] but got [${actualHeaders.join(",")}]`;

          const headerError = getPurposeError(
            tracing,
            PurposeErrorCodes.INVALID_CSV_HEADERS,
            errorMessage,
          );
          await sendPurposeErrors([headerError], tracing, producerService, ctx);
          return;
        }

        const hasSemiColonSeparator = tracingRecords.some((trace) => {
          return JSON.stringify(Object.keys(trace)).includes(";");
        });

        if (hasSemiColonSeparator) {
          const delimiterError = getPurposeError(
            tracing,
            PurposeErrorCodes.INVALID_DELIMITER,
            `Invalid delimiter found on csv`,
          );
          await sendPurposeErrors(
            [delimiterError],
            tracing,
            producerService,
            ctx,
          );
          return;
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
  const invalidRows = new Set(
    formalErrors
      .filter((error) => error.errorCode === PurposeErrorCodes.INVALID_PURPOSE)
      .map((error) => error.rowNumber),
  );

  const validRecords = tracingRecords.filter(
    (record) => !invalidRows.has(record.rowNumber),
  );
  logger(ctx).info(
    `Get enriched purposes, for tracingId: ${tracing.tracingId}`,
  );
  enrichedPurposes = await dbService.getEnrichedPurpose(validRecords, tracing);

  const purposeErrors: PurposeErrorMessageArray = formalErrors;

  enrichedPurposes.forEach((item) => {
    const purposeError = PurposeErrorMessageArray.safeParse(item).data;
    if (purposeError) {
      purposeErrors.push(...purposeError);
    }
  });

  if (purposeErrors && purposeErrors.length > 0) {
    logger(ctx).info(
      `${purposeErrors.length} purpose errors found, for tracingId: ${tracing.tracingId}, sending error messages`,
    );
    await sendPurposeErrors(purposeErrors, tracing, producerService, ctx);
    logger(ctx).info(
      `Purpose errors messages sent, for tracingId: ${tracing.tracingId}`,
    );
  } else {
    const purposeEnriched = EnrichedPurposeArray.safeParse(enrichedPurposes);

    if (purposeEnriched.error) {
      throw genericInternalError(
        `Error processing enriched purpose ${purposeEnriched.error.message}`,
      );
    }

    if (purposeEnriched.data) {
      logger(ctx).info(`Inserting enriched CSV on path: ${bucketS3Key}`);
      const csvData = generateCSV(purposeEnriched.data, tracing.tenantId);
      const input = Buffer.from(csvData);
      await fileManager.writeObject(
        input,
        "text/csv",
        bucketS3Key,
        config.bucketEnrichedS3Name,
      );
      logger(ctx).info(`Finish inserting enriched CSV on path: ${bucketS3Key}`);
    }
  }
}

async function sendPurposeErrors(
  purposeErrors: PurposeErrorMessage[],
  tracing: TracingFromS3KeyPathDto,
  producerService: ProducerService,
  ctx: WithSQSMessageId<AppContext>,
) {
  const sortedErrors = purposeErrors.sort((a, b) => a.rowNumber - b.rowNumber);
  const BATCH_SIZE = config.batchSize;

  for (let i = 0; i < sortedErrors.length; i += BATCH_SIZE) {
    const batch = sortedErrors.slice(i, i + BATCH_SIZE);

    const promises = batch.map((record, index) => {
      const globalIndex = i + index;
      return producerService.sendErrorMessage(
        {
          tracingId: tracing.tracingId,
          version: tracing.version,
          errorCode: record.errorCode,
          purposeId: record.purposeId,
          message: record.message,
          rowNumber: record.rowNumber,
          updateTracingState: globalIndex === sortedErrors.length - 1,
        },
        ctx,
      );
    });

    await Promise.all(promises);
  }

  logger(ctx).info(
    `PurposeError messages sent on queue for tracingId: ${tracing.tracingId}.`,
  );
}

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
