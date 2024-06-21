import { config } from "../utilities/config.js";
import { SQS } from "pagopa-interop-tracing-commons";
import { genericInternalError } from "pagopa-interop-tracing-models";
import { EnrichedPurpose } from "../models/messages.js";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendErrorMessage(
      error: string,
      tracingId: string,
      purpose_id: string,
      correlationId: string,
    ): Promise<void> {
      try {
        await SQS.sendMessage(
          sqsClient,
          config.sqsProcessingErrorEndpoint,
          JSON.stringify({ error, tracingId, purpose_id, correlationId }),
        );
      } catch (err) {
        const errorMsg = `Error in sendErrorMessage: ${err instanceof Error ? err.message : String(err)}`;
        throw genericInternalError(errorMsg);
      }
    },

    async handleMissingPurposes(
      errorPurposes: EnrichedPurpose[],
      tracingId: string,
      correlationId: string,
    ) {
      try {
        const errorMessagePromises = errorPurposes.map((record) =>
          this.sendErrorMessage(
            "Purpose not found",
            tracingId,
            record.purpose_id,
            correlationId,
          ),
        );
        await Promise.all(errorMessagePromises);
      } catch (err) {
        const errorMsg = `Error in handleMissingPurposes: ${err instanceof Error ? err.message : String(err)}`;
        throw genericInternalError(errorMsg);
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
