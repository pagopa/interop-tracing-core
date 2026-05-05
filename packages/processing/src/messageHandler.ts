import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { ProcessingService } from "./services/processingService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";
import { decodeSQSEventMessage } from "./models/models.js";
import { CorrelationId, unsafeBrandId } from "pagopa-interop-tracing-models";

export function processMessage(
  processingService: ProcessingService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    const decodedEventMessage = decodeSQSEventMessage(message);

    try {
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: unsafeBrandId<CorrelationId>(
          decodedEventMessage.correlationId,
        ),
        messageId: message.MessageId,
      };

      await processingService.processTracing(decodedEventMessage, ctx);
    } catch (error) {
      throw errorMapper(
        error,
        logger({
          serviceName: config.applicationName,
          correlationId: decodedEventMessage?.correlationId,
          messageId: message.MessageId,
        }),
      );
    }
  };
}
