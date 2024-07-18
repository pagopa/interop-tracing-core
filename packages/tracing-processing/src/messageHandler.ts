import { SQS } from "pagopa-interop-tracing-commons";
import { ReplacementService } from "./services/replacementService.js";
import { decodeSQSMessage } from "./models/models.js";
import { EnrichedService } from "./services/enrichedService.js";
import { errorMapper } from "./utilities/errorMapper.js";

export function processReplacementUploadMessage(
  replacementService: ReplacementService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSQSMessage(message);
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
      const tracing = decodeSQSMessage(message);
      await enrichedService.insertEnrichedTrace(tracing);
    } catch (e) {
      throw errorMapper(e);
    }
  };
}
