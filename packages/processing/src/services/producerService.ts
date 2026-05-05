import { config } from "../utilities/config.js";
import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { ProcessingResultDto } from "pagopa-interop-tracing-models";
import { sendProcessingResultMessageError } from "../models/errors.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendProcessingResultMessage(
      result: ProcessingResultDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<void> {
      try {
        logger(ctx).info(
          `Processing result message sent on queue for tracingId: ${
            result.tracingId
          }. Payload: ${JSON.stringify(result)}`,
        );

        await SQS.sendMessage(
          sqsClient,
          config.sqsProcessingResultsEndpoint,
          JSON.stringify(result),
          ctx.correlationId,
        );
      } catch (error: unknown) {
        throw sendProcessingResultMessageError(
          `Error sending processing result for tracingId: ${result.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
