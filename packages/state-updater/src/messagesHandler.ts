import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { TracingStoreDbService } from "./services/tracingStoreDbService.js";
import {
  decodeSQSMessageCorrelationId,
  decodeSQSPurposeErrorMessage,
  decodeSQSUpdateTracingStateMessage,
} from "./model/models.js";
import { errorMapper } from "./utilities/errorMapper.js";
import {
  CorrelationId,
  tracingState,
  unsafeBrandId,
} from "pagopa-interop-tracing-models";
import { config } from "./utilities/config.js";

export function processTracingStateMessage(
  service: TracingStoreDbService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    const decodedAttributeMessage = decodeSQSMessageCorrelationId(message);

    try {
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: unsafeBrandId<CorrelationId>(
          decodedAttributeMessage.correlationId,
        ),
        messageId: message.MessageId,
      };

      await service.updateTracingState(
        decodeSQSUpdateTracingStateMessage(message),
        ctx,
      );
    } catch (error: unknown) {
      throw errorMapper(
        error,
        logger({
          serviceName: config.applicationName,
          correlationId: decodedAttributeMessage?.correlationId,
          messageId: message.MessageId,
        }),
      );
    }
  };
}

export function processPurposeErrorMessage(
  service: TracingStoreDbService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    const decodedAttributeMessage = decodeSQSMessageCorrelationId(message);
    const ctx: WithSQSMessageId<AppContext> = {
      serviceName: config.applicationName,
      correlationId: unsafeBrandId<CorrelationId>(
        decodedAttributeMessage.correlationId,
      ),
      messageId: message.MessageId,
    };

    try {
      const purposeError = decodeSQSPurposeErrorMessage(message);
      if (purposeError.updateTracingState) {
        await service.updateTracingState(
          {
            tracingId: purposeError.tracingId,
            version: purposeError.version,
            state: tracingState.error,
          },
          ctx,
        );
      } else {
        await service.savePurposeError(purposeError, ctx);
      }
    } catch (error: unknown) {
      throw errorMapper(
        error,
        logger({
          serviceName: config.applicationName,
          correlationId: decodedAttributeMessage?.correlationId,
          messageId: message.MessageId,
        }),
      );
    }
  };
}
