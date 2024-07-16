import {
  AppContext,
  WithSQSMessageId,
  genericLogger,
  logger,
} from "pagopa-interop-tracing-commons";
import { TracingEnriched, TracingFromCsv } from "../models/messages.js";
import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";
import { insertEnrichedTraceError } from "../models/errors.js";
import { tracingState } from "pagopa-interop-tracing-models";

export const enrichedServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
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

        const s3KeyPath = createS3Path(tracing);

        const enrichedTracingRecords: TracingEnriched[] =
          await bucketService.readObject(s3KeyPath);

        if (!enrichedTracingRecords || enrichedTracingRecords.length === 0) {
          throw new Error(`No record found for key ${s3KeyPath}`);
        }

        const tracesInserted = await dbService.insertTraces(
          tracing.tracingId,
          enrichedTracingRecords,
        );

        if (tracesInserted.length > 0) {
          await producerService.sendUpdateState(
            {
              tracingId: tracing.tracingId,
              version: tracing.version,
              state: tracingState.completed,
            },
            ctx,
          );
        } else {
          throw new Error("No traces were inserted");
        }
      } catch (error: unknown) {
        throw insertEnrichedTraceError(
          `Error inserting traces with tracingId: ${message.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};
export function createS3Path(message: TracingFromCsv) {
  return `tenantId=${message.tenantId}/date=${message.date}/tracingId=${message.tracingId}/version=${message.version}/correlationId=${message.correlationId}/${message.tracingId}.csv`;
}

export type EnrichedService = ReturnType<typeof enrichedServiceBuilder>;
