import { TracingFromS3KeyPathDto } from "pagopa-interop-tracing-models";
import { DBService } from "./enricherService.js";
import { ProducerService } from "./producerService.js";
import {
  AppContext,
  FileManager,
  PurposeErrorCodes,
  WithSQSMessageId,
  logger,
  parseCSV,
} from "pagopa-interop-tracing-commons";
import { TracingRecordSchema } from "../models/db.js";
import {
  EnrichedPurpose,
  expectedInputCSVHeaders,
  PurposeErrorMessage,
} from "../models/csv.js";
import { processTracingError } from "../models/errors.js";
import { config } from "../utilities/config.js";
import { checkRecords } from "../utilities/checkCSVFormalErrors.js";
import { CsvWriter } from "../utilities/csvWriter.js";

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

        let tracingHasErrors = false;
        let headersChecked = false;
        let tracingRowNumber = 0;

        const tracingCsv = new CsvWriter(tracing.tenantId);

        await parseCSV<TracingRecordSchema>(
          enrichedDataObject,
          async (tracingRecords, stopProcess) => {
            if (tracingRecords.length === 0) return;

            if (!headersChecked) {
              const actualHeaders = Object.keys(tracingRecords[0]).sort();
              const sortedExpectedHeaders = [...expectedInputCSVHeaders].sort();

              const headersMatch =
                actualHeaders.length === sortedExpectedHeaders.length &&
                actualHeaders.every((h, i) => h === sortedExpectedHeaders[i]);

              if (!headersMatch) {
                const expectedStr = sortedExpectedHeaders.join(",");
                const actualStr = actualHeaders.join(",");
                const headerError: PurposeErrorMessage = {
                  rowNumber: 0,
                  purposeId: "",
                  errorCode: PurposeErrorCodes.INVALID_CSV_HEADERS,
                  message: `CSV headers invalid. Expected [${expectedStr}] but got [${actualStr}]`,
                };

                await sendPurposeErrors(
                  [headerError],
                  tracing,
                  producerService,
                  ctx,
                );

                return stopProcess();
              }

              const hasSemiColonSeparator = tracingRecords.some((trace) =>
                Object.keys(trace).some((k) => k.includes(";")),
              );

              if (hasSemiColonSeparator) {
                const delimiterError: PurposeErrorMessage = {
                  rowNumber: 0,
                  purposeId: "",
                  errorCode: PurposeErrorCodes.INVALID_DELIMITER,
                  message: `Invalid delimiter found on csv`,
                };

                await sendPurposeErrors(
                  [delimiterError],
                  tracing,
                  producerService,
                  ctx,
                );

                return stopProcess();
              }

              headersChecked = true;
            }

            tracingRecords.forEach((row) => {
              tracingRowNumber++;
              row.rowNumber = tracingRowNumber;
            });

            const formalErrorsRecords = await checkRecords(
              tracingRecords,
              tracing,
            );

            const { enrichedRows, errors } = await processEnrichmentChunk(
              dbService,
              tracingRecords,
              tracing,
              formalErrorsRecords,
              ctx,
            );

            if (errors.length > 0) {
              tracingHasErrors = true;
              return await handlePurposeErrors(
                errors,
                tracing,
                producerService,
                ctx,
              );
            }

            if (enrichedRows.length > 0) {
              tracingCsv.writeBatch(enrichedRows);
            }
          },
        );

        if (!tracingHasErrors) {
          const uploadTracingCsv = fileManager.writeStream(
            tracingCsv.getStream(),
            "text/csv",
            bucketS3Key,
            config.bucketEnrichedS3Name,
          );

          tracingCsv.close();

          await uploadTracingCsv;
        }
      } catch (error: unknown) {
        throw processTracingError(
          `Error processing tracing for tracingId: ${tracing.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export async function processEnrichmentChunk(
  dbService: DBService,
  tracingRecords: TracingRecordSchema[],
  tracing: TracingFromS3KeyPathDto,
  formalErrors: PurposeErrorMessage[],
  ctx: WithSQSMessageId<AppContext>,
): Promise<{
  enrichedRows: EnrichedPurpose[];
  errors: PurposeErrorMessage[];
}> {
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

  const { enriched, errors } = await dbService.getEnrichedPurpose(
    validRecords,
    tracing,
  );

  return {
    enrichedRows: enriched,
    errors: [...formalErrors, ...errors],
  };
}

export async function handlePurposeErrors(
  errors: PurposeErrorMessage[],
  tracing: TracingFromS3KeyPathDto,
  producerService: ProducerService,
  ctx: WithSQSMessageId<AppContext>,
): Promise<void> {
  logger(ctx).info(
    `${errors.length} purpose errors found, for tracingId: ${tracing.tracingId}, sending error messages`,
  );

  await sendPurposeErrors(errors, tracing, producerService, ctx);

  logger(ctx).info(
    `Purpose errors messages sent, for tracingId: ${tracing.tracingId}`,
  );
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
