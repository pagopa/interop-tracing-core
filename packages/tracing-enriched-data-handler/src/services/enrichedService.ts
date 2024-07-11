import { genericLogger } from "pagopa-interop-tracing-commons";
import { TracingEnriched, TracingFromCsv } from "../models/messages.js";
import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";
import { insertEnrichedTraceError } from "../models/errors.js";

export const enrichedServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  return {
    async insertEnrichedTrace(message: TracingFromCsv) {
      try {
        const { data: tracing, error: tracingError } =
          TracingFromCsv.safeParse(message);

        if (tracingError) {
          throw new Error(
            `Tracing message is not valid: ${JSON.stringify(tracingError)}`,
          );
        }

        genericLogger.info(`Processing tracing id: ${tracing.tracingId}`);

        const s3KeyPath = createS3Path(tracing);

        const enrichedTracingRecords: TracingEnriched[] =
          await bucketService.readObject(s3KeyPath);

        if (!enrichedTracingRecords || enrichedTracingRecords.length === 0) {
          throw new Error(`No record found for key ${s3KeyPath}`);
        }

        const tracingInserted = await dbService.insertTracing(
          tracing.tracingId,
          enrichedTracingRecords,
        );

        if (tracingInserted.length > 0) {
          await producerService.sendUpdateState(
            tracing.tracingId,
            tracing.version,
            "COMPLETE",
          );
        } else {
          throw new Error(`Error on inserting tracing ${message.tracingId}`);
        }
      } catch (e) {
        throw insertEnrichedTraceError(
          `Error on inserting tracing ${message.tracingId}`,
        );
      }
    },
  };
};
export function createS3Path(message: TracingFromCsv) {
  return `tenantId=${message.tenantId}/date=${message.date}/tracingId=${message.tracingId}/version=${message.version}/correlationId=${message.correlationId}/${message.tracingId}.csv`;
}

export type EnrichedService = ReturnType<typeof enrichedServiceBuilder>;
