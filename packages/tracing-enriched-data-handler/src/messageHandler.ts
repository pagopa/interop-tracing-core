import { SQS } from "pagopa-interop-tracing-commons";
import { EnrichedService } from "./services/enrichedService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { ReplacementService } from "./services/replacementService.js";
import { decodeSqsMessage } from "./models/models.js";

export function processReplacementUploadMessage(
  replacementService: ReplacementService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSqsMessage(message);
      await replacementService.deleteTraces(tracing);
    } catch (e) {
      throw errorMapper(e);
    }
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
