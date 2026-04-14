import {
  TracingFromS3KeyPathDto,
  generateId,
  purposeErrorSeverity,
} from "pagopa-interop-tracing-models";
import { DBService } from "./enricherService.js";
import { ProducerService } from "./producerService.js";
import {
  AppContext,
  FileManager,
  PurposeErrorCodes,
  WithSQSMessageId,
  isWarningErrorCode,
  logger,
  parseCSV,
} from "pagopa-interop-tracing-commons";
import { TracingRecordSchema } from "../models/db.js";
import { expectedInputCSVHeaders } from "../models/csv.js";
import {
  EnrichedPurposeRow,
  PurposeErrorRow,
  createEnrichedCsvMapping,
  errorsCsvMapping,
} from "pagopa-interop-tracing-models";
import { processTracingError } from "../models/errors.js";
import { config } from "../utilities/config.js";
import { checkRecords } from "../utilities/checkCSVFormalErrors.js";
import { CsvWriter } from "../utilities/csvWriter.js";
import { tracingState } from "pagopa-interop-tracing-models";

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
      const tracingCsv = new CsvWriter(
        createEnrichedCsvMapping(tracing.tenantId),
      );
      const tracingErrorsCsv = new CsvWriter<PurposeErrorRow>(errorsCsvMapping);

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

        let tracingHasBlockingErrors = false;
        let tracingHasWarnings = false;
        let headersChecked = false;
        let tracingRowNumber = 0;

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
                tracingHasBlockingErrors = true;
                const expectedStr = sortedExpectedHeaders.join(",");
                const actualStr = actualHeaders.join(",");
                const headerError: PurposeErrorRow = {
                  id: generateId(),
                  tracingId: tracing.tracingId,
                  version: tracing.version,
                  purposeId: "",
                  severity: purposeErrorSeverity.invalid,
                  errorCode: PurposeErrorCodes.INVALID_CSV_HEADERS,
                  message: `CSV headers invalid. Expected [${expectedStr}] but got [${actualStr}]`,
                  rowNumber: 0,
                };

                tracingErrorsCsv.writeBatch([headerError]);

                return stopProcess();
              }

              const hasSemiColonSeparator = tracingRecords.some((trace) =>
                Object.keys(trace).some((k) => k.includes(";")),
              );

              if (hasSemiColonSeparator) {
                tracingHasBlockingErrors = true;
                const delimiterError: PurposeErrorRow = {
                  id: generateId(),
                  tracingId: tracing.tracingId,
                  version: tracing.version,
                  purposeId: "",
                  severity: purposeErrorSeverity.invalid,
                  errorCode: PurposeErrorCodes.INVALID_DELIMITER,
                  message: `Invalid delimiter found on csv`,
                  rowNumber: 0,
                };

                tracingErrorsCsv.writeBatch([delimiterError]);

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
              const hasBlocking = errors.some(
                (e) => !isWarningErrorCode(e.errorCode),
              );
              const hasWarning = errors.some((e) =>
                isWarningErrorCode(e.errorCode),
              );
              if (hasBlocking) {
                tracingHasBlockingErrors = true;
              }
              if (hasWarning) {
                tracingHasWarnings = true;
              }
              tracingErrorsCsv.writeBatch(errors);
            }

            // Enriched rows include warning rows (rows whose only error was a
            // warning-severity one) as well as fully valid rows. Rows with any
            // blocking formal error are already excluded upstream in
            // processEnrichmentChunk.
            if (enrichedRows.length > 0) {
              tracingCsv.writeBatch(enrichedRows);
            }
          },
        );

        if (tracingHasBlockingErrors) {
          const uploadTracingErrorsCsv = fileManager.writeStream(
            tracingErrorsCsv.getStream(),
            "text/csv",
            bucketS3Key,
            config.bucketTracingErrorsS3Name,
          );

          tracingErrorsCsv.close();

          await uploadTracingErrorsCsv;

          logger(ctx).info(
            `Tracing Errors CSV uploaded successfully for tracingId: ${tracing.tracingId} to bucket ${config.bucketTracingErrorsS3Name}`,
          );

          await producerService.sendProcessingResultMessage(
            {
              tracingId: tracing.tracingId,
              version: tracing.version,
              state: tracingState.error,
              errorsCsvPath: bucketS3Key,
            },
            ctx,
          );
        } else if (tracingHasWarnings) {
          const uploadTracingErrorsCsv = fileManager.writeStream(
            tracingErrorsCsv.getStream(),
            "text/csv",
            bucketS3Key,
            config.bucketTracingErrorsS3Name,
          );

          tracingErrorsCsv.close();

          const uploadTracingCsv = fileManager.writeStream(
            tracingCsv.getStream(),
            "text/csv",
            bucketS3Key,
            config.bucketEnrichedS3Name,
          );

          tracingCsv.close();

          await Promise.all([uploadTracingErrorsCsv, uploadTracingCsv]);

          logger(ctx).info(
            `Tracing Errors CSV uploaded successfully for tracingId: ${tracing.tracingId} to bucket ${config.bucketTracingErrorsS3Name}`,
          );
          logger(ctx).info(
            `Tracing CSV uploaded successfully for tracingId: ${tracing.tracingId} to bucket ${config.bucketEnrichedS3Name}`,
          );

          await producerService.sendProcessingResultMessage(
            {
              tracingId: tracing.tracingId,
              version: tracing.version,
              state: tracingState.warning,
              errorsCsvPath: bucketS3Key,
            },
            ctx,
          );
        } else {
          const uploadTracingCsv = fileManager.writeStream(
            tracingCsv.getStream(),
            "text/csv",
            bucketS3Key,
            config.bucketEnrichedS3Name,
          );

          tracingCsv.close();

          await uploadTracingCsv;

          logger(ctx).info(
            `Tracing CSV uploaded successfully for tracingId: ${tracing.tracingId} to bucket ${config.bucketEnrichedS3Name}`,
          );

          await producerService.sendProcessingResultMessage(
            {
              tracingId: tracing.tracingId,
              version: tracing.version,
              state: tracingState.completed,
            },
            ctx,
          );
        }
      } catch (error: unknown) {
        throw processTracingError(
          `Error processing tracing for tracingId: ${tracing.tracingId}. Details: ${error}`,
        );
      } finally {
        // Ensure the CSV stream is always closed even if errors occurred or the upload was skipped due errors
        tracingCsv.close();
        tracingErrorsCsv.close();
      }
    },
  };
};

export async function processEnrichmentChunk(
  dbService: DBService,
  tracingRecords: TracingRecordSchema[],
  tracing: TracingFromS3KeyPathDto,
  formalErrors: PurposeErrorRow[],
  ctx: WithSQSMessageId<AppContext>,
): Promise<{
  enrichedRows: EnrichedPurposeRow[];
  errors: PurposeErrorRow[];
}> {
  // Rows affected by any blocking formal error must be excluded from
  // enrichment: they will only be written to the errors CSV and will drive
  // the tracing state to ERROR. Warning-severity errors do not filter the
  // row out, so it still reaches the enriched CSV.
  const blockingRowNumbers = new Set(
    formalErrors
      .filter((error) => !isWarningErrorCode(error.errorCode))
      .map((error) => error.rowNumber),
  );

  const validRecords = tracingRecords.filter(
    (record) => !blockingRowNumbers.has(record.rowNumber),
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

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
