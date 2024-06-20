import { config } from "../utilities/config.js";
import { SQS } from "pagopa-interop-tracing-commons";
import { genericInternalError } from "pagopa-interop-tracing-models";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendErrorMessage(error: object): Promise<void> {
      try {
        await SQS.sendMessage(
          sqsClient,
          config.sqsProcessingErrorEndpoint,
          JSON.stringify(error),
        );
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
