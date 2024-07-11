import { SQS } from "pagopa-interop-tracing-commons";
import { decodeSqsMessage } from "./models/models.js";
import { EnrichedService } from "./services/enrichedService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { ReplacementService } from "./services/replacementService.js";

export function processReplacementUploadMessage(
  replacementService: ReplacementService,
): (message: SQS.Message) => void {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSqsMessage(message);
      await replacementService.deleteTracing(tracing);
    } catch (e) {
      throw errorMapper(e);
    }
  };
}
export function processEnrichedStateMessage(
  enrichedService: EnrichedService,
): (message: SQS.Message) => void {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSqsMessage(message);
      await enrichedService.insertEnrichedTrace(tracing);
    } catch (e) {
      throw errorMapper(e);
    }
  };
}
