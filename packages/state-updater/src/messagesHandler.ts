import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { TracingStoreService } from "./services/tracingStoreService.js";
import {
  decodeSQSMessageCorrelationId,
  decodeSQSProcessingResultMessage,
} from "./model/models.js";
import { errorMapper } from "./utilities/errorMapper.js";
import {
  CorrelationId,
  tracingState,
  unsafeBrandId,
} from "pagopa-interop-tracing-models";
import { config } from "./utilities/config.js";

export function processProcessingResultMessage(
  service: TracingStoreService,
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
      const result = decodeSQSProcessingResultMessage(message);

      const shouldProcess = await service.checkTracingVersion(
        result.tracingId,
        result.version,
      );

      if (!shouldProcess) {
        return;
      }

      if (result.state === tracingState.error) {
        await service.copyPurposeErrorsFromS3(result.errorsCsvPath);
      }

      await service.updateTracingState(result);

      logger(ctx).info(
        `Updating tracing state to "${result.state}" for tracingId: ${result.tracingId}, version: ${result.version}`,
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
