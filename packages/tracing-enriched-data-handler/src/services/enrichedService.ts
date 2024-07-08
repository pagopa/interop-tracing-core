import { genericLogger } from "pagopa-interop-tracing-commons";
import { TracingEnriched, TracingFromCsv } from "../models/messages.js";
import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";

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
          throw `Tracing message is not valid: ${JSON.stringify(tracingError)}`;
        }

        genericLogger.info(`Processing tracing id: ${tracing.tracingId}`);

        const s3KeyPath = createS3Path(tracing);

        const enrichedTracingRecords: TracingEnriched[] =
          await bucketService.readObject(s3KeyPath);

        if (!enrichedTracingRecords || enrichedTracingRecords.length === 0) {
          throw `No record found for key ${s3KeyPath}`;
        }

        await dbService.insertTracing(
          tracing.tracingId,
          enrichedTracingRecords,
        );

        producerService.sendUpdateState(
          tracing.tracingId,
          tracing.version,
          "COMPLETE",
        );
      } catch (e) {
        throw e; // to do throw
      }
    },
  };
};
export function createS3Path(message: TracingFromCsv) {
  return `tenantId=${message.tenantId}/date=${message.date}/tracingId=${message.tracingId}/version=${message.version}/correlationId=${message.correlationId}/${message.tracingId}.csv`;
}

export type EnrichedService = ReturnType<typeof enrichedServiceBuilder>;
