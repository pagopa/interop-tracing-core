import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { decodeSQSMessage } from "./models/models.js";
import { EnrichedService } from "./services/enrichedService.js";
import { ReplacementServiceBuilder } from "./services/replacementService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";

export function processReplacementUploadMessage(
  replacementService: ReplacementServiceBuilder,
): (message: unknown) => Promise<void> {
  return async (message: unknown) => {
    replacementService.deleteTracing(message);
  };
}
export function processEnrichedStateMessage(
  enrichedService: EnrichedService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    try {
      const tracing = decodeSQSMessage(message);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: tracing.correlationId,
        messageId: message.MessageId,
      };

      await enrichedService.insertEnrichedTrace(tracing, ctx);
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
