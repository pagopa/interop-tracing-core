import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { ProcessingService } from "./services/processingService.js";
import { decodeSQSMessage } from "./models/models.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";

export function processMessage(
  processingService: ProcessingService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSQSMessage(message);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: tracing.correlationId,
        messageId: message.MessageId,
      };

      await processingService.processTracing(tracing, ctx);
    } catch (error) {
      throw errorMapper(
        error,
        logger({
          serviceName: config.applicationName,
          messageId: message.MessageId,
        }),
      );
    }
  };
}
