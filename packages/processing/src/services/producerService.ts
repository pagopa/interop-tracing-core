import { config } from "../utilities/config.js";
import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import {
  SavePurposeErrorDto,
  UpdateTracingStateDto,
} from "pagopa-interop-tracing-models";
import {
  sendMessagePurposeError,
  sendTracingUpdateStateMessageError,
} from "../models/errors.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendErrorMessage(
      purposeError: SavePurposeErrorDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<void> {
      try {
        await SQS.sendMessage(
          sqsClient,
          config.sqsProcessingErrorEndpoint,
          JSON.stringify(purposeError),
          ctx.correlationId,
        );
      } catch (error: unknown) {
        throw sendMessagePurposeError(
          `Error sending purpose message error for tracingId: ${purposeError.tracingId}. Details: ${error}`,
        );
      }
    },
    async sendTracingUpdateStateMessage(
      updateTracingState: UpdateTracingStateDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<void> {
      try {
        logger(ctx).info(
          `UpdateTracingState message sent on queue for tracingId: ${
            updateTracingState.tracingId
          }. Payload: ${JSON.stringify(updateTracingState)}`,
        );

        await SQS.sendMessage(
          sqsClient,
          config.sqsEnricherStateEndpoint,
          JSON.stringify(updateTracingState),
          ctx.correlationId,
        );
      } catch (error: unknown) {
        throw sendTracingUpdateStateMessageError(
          `Error sending tracing update state for tracingId: ${updateTracingState.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
