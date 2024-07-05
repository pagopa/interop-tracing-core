import { SQS } from "pagopa-interop-tracing-commons";
import { decodeSqsMessage } from "./models/models.js";
import { EnrichedService } from "./services/enrichedService.js";
import { ReplacementServiceBuilder } from "./services/replacementService.js";

export function processReplacementUploadMessage(
  replacementService: ReplacementServiceBuilder,
): (message: unknown) => void {
  return async (message: unknown) => {
    console.log("MESSAGE");
    replacementService.deleteTracing(message);
  };
}
export function processEnrichedStateMessage(
  enrichedService: EnrichedService,
): (message: SQS.Message) => void {
  return async (message: SQS.Message) => {
    console.log(message);
    const tracing = decodeSqsMessage(message);
    console.log("TRACING", tracing);
    enrichedService.insertTracing(message);
  };
}
