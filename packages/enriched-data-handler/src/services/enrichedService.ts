import {
  AppContext,
  FileManager,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { TracingEnriched, TracingFromCsv } from "../models/messages.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";
import { insertEnrichedTraceError } from "../models/errors.js";
import { tracingState } from "pagopa-interop-tracing-models";
import { parseCSV } from "../utilities/csvHandler.js";

export const enrichedServiceBuilder = (
  dbService: DBService,
  producerService: ProducerService,
  fileManager: FileManager,
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

        const s3KeyPath = fileManager.buildS3Key(
          tracing.tenantId,
          tracing.date,
          tracing.tracingId,
          tracing.version,
          tracing.correlationId,
        );

        const enrichedDataObject = await fileManager.readObject(s3KeyPath);
        const enrichedTracingRecords: TracingEnriched[] =
          await parseCSV(enrichedDataObject);

        if (!enrichedTracingRecords || enrichedTracingRecords.length === 0) {
          logger(ctx).info(
            `No data in CSV for tracingId: ${tracing.tracingId}. Skipping trace insertion.`,
          );
          await producerService.sendTracingUpdateStateMessage(
            {
              tracingId: tracing.tracingId,
              version: tracing.version,
              state: tracingState.completed,
            },
            ctx,
          );
          return;
        }

        await dbService.ingestTraces(tracing.tracingId, enrichedTracingRecords);

        await producerService.sendTracingUpdateStateMessage(
          {
            tracingId: tracing.tracingId,
            version: tracing.version,
            state: tracingState.completed,
          },
          ctx,
        );
      } catch (error: unknown) {
        throw insertEnrichedTraceError(
          `Error inserting traces with tracingId: ${message.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export type EnrichedService = ReturnType<typeof enrichedServiceBuilder>;
