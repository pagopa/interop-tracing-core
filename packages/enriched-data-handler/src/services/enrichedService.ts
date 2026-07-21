import {
  type AppContext,
  type FileManager,
  logger,
  parseCSV,
  type WithSQSMessageId,
} from "pagopa-interop-tracing-commons";
import { insertEnrichedTraceError } from "../models/errors.js";
import { type TracingEnriched, TracingFromCsv } from "../models/messages.js";
import { config } from "../utilities/config.js";
import type { DBService } from "./db/dbService.js";
import type { TracingStoreDBService } from "./db/tracingStoreDbService.js";

export const enrichedServiceBuilder = (
  dbService: DBService,
  fileManager: FileManager,
  tracingStoreDbService: TracingStoreDBService,
) => {
  const ingestViaInsert = async (
    s3KeyPath: string,
    tracing: TracingFromCsv,
    ctx: WithSQSMessageId<AppContext>,
  ): Promise<void> => {
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
  };

  const ingestViaCopy = async (
    s3KeyPath: string,
    tracing: TracingFromCsv,
  ): Promise<void> => {
    const s3Uri = `s3://${config.bucketEnrichedS3Name}/${s3KeyPath}`;

    await dbService.copyToStaging(s3Uri);
    await dbService.finalizeMergeToTarget(tracing.tracingId);
  };

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

        const shouldProcess = await tracingStoreDbService.checkTracingVersion(
          tracing.tracingId,
          tracing.version,
        );

        if (!shouldProcess) {
          return;
        }

        const s3KeyPath = fileManager.buildS3Key(
          tracing.tenantId,
          tracing.date,
          tracing.tracingId,
          tracing.version,
          tracing.correlationId,
        );

        switch (config.dbIngestMode) {
          case "INSERT":
            await ingestViaInsert(s3KeyPath, tracing, ctx);
            break;

          case "COPY":
            // In COPY mode the primary dbService connection is expected to point at Redshift.
            await ingestViaCopy(s3KeyPath, tracing);
            break;
        }
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
