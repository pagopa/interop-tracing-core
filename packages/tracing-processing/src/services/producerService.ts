import { config } from "../utilities/config.js";
import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { SavePurposeErrorDto } from "pagopa-interop-tracing-models";
import { sendMessagePurposeError } from "../models/errors.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendErrorMessage(
      purposeError: SavePurposeErrorDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<void> {
      try {
        logger(ctx).info(
          `PurposeError message sent on queue for tracingId: ${
            purposeError.tracingId
          }, Payload: ${JSON.stringify(purposeError)}`,
        );
        await SQS.sendMessage(
          sqsClient,
          config.sqsProcessingErrorEndpoint,
          JSON.stringify(purposeError),
          ctx.correlationId,
        );
        throw sendMessagePurposeError(
          `Error sending purpose message error for tracingId: ${
            purposeError.tracingId
          }, Details: ${"a"}`,
        );
      } catch (err) {
        throw sendMessagePurposeError(
          `Error sending purpose message error for tracingId: ${purposeError.tracingId}, Details: ${err}`,
        );
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
