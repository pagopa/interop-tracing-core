import {
  AppContext,
  FileManager,
  WithSQSMessageId,
  logger,
  parseCSV,
} from "pagopa-interop-tracing-commons";
import { TracingEnriched, TracingFromCsv } from "../models/messages.js";
import { DBService } from "./db/dbService.js";
import { TracingStoreDBService } from "./db/tracingStoreDbService.js";
import { insertEnrichedTraceError } from "../models/errors.js";

export const enrichedServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager,
  tracingStoreDbService: TracingStoreDBService,
) => {
  return {
    async insertEnrichedTrace(
      message: TracingFromCsv,
      ctx: WithSQSMessageId<AppContext>,
    ) {
      try {
        const { data: tracing, error: tracingError } =
          TracingFromCsv.safeParse(message);

        if (tracingError) {
          throw new Error(
            `Tracing message is not valid: ${JSON.stringify(tracingError)}`,
          );
        }

        logger(ctx).info(
          `Reading and processing tracing enriched with id: ${tracing.tracingId}`,
        );

        const tracingCurrentVersion =
          await tracingStoreDbService.getTracingVersion(tracing.tracingId);

        if (tracingCurrentVersion > tracing.version) {
          logger(ctx).info(
            `Skipping tracingId ${tracing.tracingId}: message version ${tracing.version} is older than current version ${currentVersion}.`,
          );
          return;
        }

        const s3KeyPath = fileManager.buildS3Key(
          tracing.tenantId,
          tracing.date,
          tracing.tracingId,
          tracing.version,
          tracing.correlationId,
        );

        const enrichedDataObject = await fileManager.readObject(s3KeyPath);

        let tracingHasData = false;

        await parseCSV<TracingEnriched>(
          enrichedDataObject,
          async (enrichedTracingRecords) => {
            if (enrichedTracingRecords.length === 0) return;

            tracingHasData = true;

            await dbService.insertToStaging(
              tracing.tracingId,
              enrichedTracingRecords,
            );
          },
        );

        if (!tracingHasData) {
          logger(ctx).info(
            `No data in CSV for tracingId: ${tracing.tracingId}. Skipping trace insertion.`,
          );
        }

        await dbService.finalizeMergeToTarget(tracing.tracingId);
      } catch (error: unknown) {
        throw insertEnrichedTraceError(
          `Error inserting traces with tracingId: ${message.tracingId}. Details: ${error}`,
        );
      } finally {
        try {
          await dbService.cleanStaging();
        } catch (cleanupError) {
          logger(ctx).error(`Error during staging cleanup: ${cleanupError}`);
        }
      }
    },
  };
};

export type EnrichedService = ReturnType<typeof enrichedServiceBuilder>;
