import { SQS, genericLogger } from "pagopa-interop-tracing-commons";
import { genericInternalError } from "pagopa-interop-tracing-models";
import { config } from "../utilities/config.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendUpdateState(tracingId: string, version: number, state: string) {
      try {
        await SQS.sendMessage(
          sqsClient,
          config.sqsEnricherStateEndpoint,
          JSON.stringify({ tracingId, version, state }),
        );
        genericLogger.info(
          `Message sent on enricher-state queue",
          ${JSON.stringify({ tracingId, version, state })}`,
        );
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
    async sendErrorMessage(_obj: unknown) {
      try {
        return Promise.resolve({});
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
