import { tracingState } from "pagopa-interop-tracing-models";
import { deleteTracesError } from "../models/errors.js";
import { TracingFromCsv } from "../models/messages.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";

export const replacementServiceBuilder = (
  dbService: DBService,
  producerService: ProducerService,
) => {
  return {
    async deleteTraces(tracing: TracingFromCsv) {
      try {
        await dbService.deleteTraces(tracing.tracingId);
        return producerService.sendTracingUpdateStateMessage({
          tracingId: tracing.tracingId,
          version: tracing.version,
          state: tracingState.completed,
          isReplacing: true,
        });
      } catch (error) {
        throw deleteTracesError(
          `Error deleting traces ${tracing.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export type ReplacementService = ReturnType<typeof replacementServiceBuilder>;
