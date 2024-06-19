import { ProcessingService } from "./services/processingService.js";
import { ProducerService } from "./services/producerService.js";

export function processMessage(
  _producerService: ProducerService,
  processingService: ProcessingService,
): (message: unknown) => void {
  return async (message: unknown) => {
    processingService.processTracing(message);
  };
}
