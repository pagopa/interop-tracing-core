import { tracingState } from "pagopa-interop-tracing-models";
import { deleteTraceError } from "../models/errors.js";
import { TracingFromCsv } from "../models/messages.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";

export const replacementServiceBuilder = (
  dbService: DBService,
  producerService: ProducerService,
) => {
  return {
    async deleteTracing(message: TracingFromCsv) {
      try {
        const { tracingId, version } = message;
        await dbService.deleteTracing(tracingId);
        return producerService.sendUpdateState({
          tracingId,
          version,
          state: tracingState.completed,
          isReplacing: true,
        });
      } catch (error) {
        throw deleteTraceError(
          `Error on deleting tracing ${message.tracingId}, detail: ${error}`,
        );
      }
    },
  };
};

export type ReplacementService = ReturnType<typeof replacementServiceBuilder>;
