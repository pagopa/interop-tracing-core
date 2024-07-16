import { SQS } from "pagopa-interop-tracing-commons";
import { decodeSqsMessage } from "./models/models.js";
import { EnrichedService } from "./services/enrichedService.js";
import { ReplacementServiceBuilder } from "./services/replacementService.js";
import { errorMapper } from "./utilities/errorMapper.js";

export function processReplacementUploadMessage(
  replacementService: ReplacementServiceBuilder,
): (message: unknown) => Promise<void> {
  return async (message: unknown) => {
    replacementService.deleteTracing(message);
  };
}
export function processEnrichedStateMessage(
  enrichedService: EnrichedService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSqsMessage(message);
      await enrichedService.insertEnrichedTrace(tracing);
    } catch (e) {
      throw errorMapper(e);
    }
  };
}
