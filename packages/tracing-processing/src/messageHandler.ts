import { SQS } from "pagopa-interop-tracing-commons";
import { ProcessingService } from "./services/processingService.js";
import { decodeSqsMessage } from "./models/models.js";
import { errorMapper } from "./utilities/errorMapper.js";

export function processMessage(
  processingService: ProcessingService,
): (message: SQS.Message) => void {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSqsMessage(message);
      await processingService.processTracing(tracing);
    } catch (error) {
      throw errorMapper(error);
    }
  };
}
