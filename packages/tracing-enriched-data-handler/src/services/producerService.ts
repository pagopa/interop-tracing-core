import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import {
  genericInternalError,
  UpdateTracingStateDto,
} from "pagopa-interop-tracing-models";
import { config } from "../utilities/config.js";
import { sendUpdateStateError } from "../models/errors.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendUpdateState(
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
        throw sendUpdateStateError(
          `Error sending tracing update state for tracingId: ${updateTracingState.tracingId}. Details: ${error}`,
        );
      }
    },
    async sendErrorMessage(obj: unknown) {
      try {
        return Promise.resolve({ obj });
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
