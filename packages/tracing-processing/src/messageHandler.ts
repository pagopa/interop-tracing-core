import { SQS } from "pagopa-interop-tracing-commons";
import { ProcessingService } from "./services/processingService.js";
import { decodeSqsMessage } from "./models/models.js";

export function processMessage(
  processingService: ProcessingService,
): (message: SQS.Message) => void {
  return async (message: SQS.Message) => {
    const tracing = decodeSqsMessage(message);
    processingService.processTracing(tracing);
  };
}
