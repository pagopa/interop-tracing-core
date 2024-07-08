import { EnrichedService } from "./services/enrichedService.js";
import { ReplacementServiceBuilder } from "./services/replacementService.js";

export function processMessage(
  enrichedService: EnrichedService,
  replacementService: ReplacementServiceBuilder,
): (message: string) => void {
  return async (message: string) => {
    const actionType = message;
    if (actionType === "INSERT_TRACING") {
      enrichedService.insertTracing(message);
    }
    if (actionType === "DELETE_TRACING") {
      replacementService.deleteTracing(message);
    }
  };
}
