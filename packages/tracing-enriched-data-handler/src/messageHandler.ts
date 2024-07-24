import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { decodeSQSEventMessage } from "./models/models.js";
import { EnrichedService } from "./services/enrichedService.js";
import { ReplacementService } from "./services/replacementService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";

export function processReplacementUploadMessage(
  replacementService: ReplacementService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    const decodedMessage = decodeSQSEventMessage(message);

    try {
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: decodedMessage.correlationId,
        messageId: message.MessageId,
      };
      await replacementService.deleteTraces(decodedMessage, ctx);
    } catch (error) {
      throw errorMapper(
        error,
        logger({
          serviceName: config.applicationName,
          correlationId: decodedMessage?.correlationId,
          messageId: message.MessageId,
        }),
      );
    }
  };
}

export function processEnrichedStateMessage(
  enrichedService: EnrichedService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    const decodedMessage = decodeSQSEventMessage(message);

    try {
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: decodedMessage.correlationId,
        messageId: message.MessageId,
      };

      await enrichedService.insertEnrichedTrace(decodedMessage, ctx);
    } catch (error) {
      throw errorMapper(
        error,
        logger({
          serviceName: config.applicationName,
          correlationId: decodedMessage?.correlationId,
          messageId: message.MessageId,
        }),
      );
    }
  };
}
