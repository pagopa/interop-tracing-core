import { SQS } from "pagopa-interop-tracing-commons";
import { ProcessingService } from "./services/processingService.js";
import { ProducerService } from "./services/producerService.js";
import { decodeSqsMessage } from "./models/models.js";

export function processMessage(
  _producerService: ProducerService,
  processingService: ProcessingService,
): (message: SQS.Message) => void {
  return async (message: SQS.Message) => {
    const parsedMessage = decodeSqsMessage(message.Body);
    if (parsedMessage) {
      processingService.processTracing(parsedMessage);
    }
  };
}
