import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { UpdateTracingStateDto } from "pagopa-interop-tracing-models";
import { config } from "../utilities/config.js";
import { sendTracingUpdateStateMessageError } from "../models/errors.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendTracingUpdateStateMessage(
      updateTracingState: UpdateTracingStateDto,
      ctx: WithSQSMessageId<AppContext>,
    ) {
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
