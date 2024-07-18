import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { OperationsService } from "./services/operationsService.js";
import {
  decodeSQSMessageCorrelationId,
  decodeSQSPurposeErrorMessage,
  decodeSQSUpdateTracingStateMessage,
} from "./model/models.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { tracingState } from "pagopa-interop-tracing-models";
import { config } from "./utilities/config.js";

export function processTracingStateMessage(
  service: OperationsService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    const decodedAttributeMessage = decodeSQSMessageCorrelationId(message);

    try {
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: decodedAttributeMessage.correlationId,
        messageId: message.MessageId,
      };

      const updateTracingStateMessage =
        decodeSQSUpdateTracingStateMessage(message);

      if (updateTracingStateMessage.isReplacing) {
        await service.triggerS3Copy(updateTracingStateMessage.tracingId, ctx);
      } else {
        await service.updateTracingState(
          decodeSQSUpdateTracingStateMessage(message),
          ctx,
        );
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

export function processPurposeErrorMessage(
  service: OperationsService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    const decodedAttributeMessage = decodeSQSMessageCorrelationId(message);
    const ctx: WithSQSMessageId<AppContext> = {
      serviceName: config.applicationName,
      correlationId: decodedAttributeMessage.correlationId,
      messageId: message.MessageId,
    };

    try {
      const purposeError = decodeSQSPurposeErrorMessage(message);
      await service.savePurposeError(purposeError, ctx);

      if (purposeError.updateTracingState) {
        await service.updateTracingState(
          {
            tracingId: purposeError.tracingId,
            version: purposeError.version,
            state: tracingState.error,
          },
          ctx,
        );
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
