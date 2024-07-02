import { EnrichedService } from "./services/enrichedService.js";
import { ReplacementServiceBuilder } from "./services/replacementService.js";

export function processMessage(
  enrichedService: EnrichedService,
  replacementService: ReplacementServiceBuilder,
): (message: unknown) => void {
  return async (message: unknown) => {
    const actionType = message;
    if (actionType === "INSERT_TRACING") {
      enrichedService.insertTracing(message);
    }
    if (actionType === "DELETE_TRACING") {
      replacementService.deleteTracing(message);
    }
  };
}
