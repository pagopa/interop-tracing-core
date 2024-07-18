import { SQS, genericLogger } from "pagopa-interop-tracing-commons";
import {
  genericInternalError,
  UpdateTracingStateDto,
} from "pagopa-interop-tracing-models";
import { config } from "../utilities/config.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendTracingUpdateState(updateTracingState: UpdateTracingStateDto) {
      try {
        genericLogger.info(
          `UpdateTracingState message sent on queue for tracingId: ${
            updateTracingState.tracingId
          }. Payload: ${JSON.stringify(updateTracingState)}`,
        );

        await SQS.sendMessage(
          sqsClient,
          config.sqsEnricherStateEndpoint,
          JSON.stringify(updateTracingState),
        );
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
    async sendPurposeError(obj: unknown) {
      try {
        return Promise.resolve({ obj });
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
