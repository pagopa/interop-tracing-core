import { config } from "../utilities/config.js";
import { SQS, logger } from "pagopa-interop-tracing-commons";
import { genericInternalError } from "pagopa-interop-tracing-models";
import { EnrichedPurpose, TracingContent } from "../models/messages.js";
import { SavePurposeErrorDto } from "pagopa-interop-tracing-models";

export const producerServiceBuilder = (sqsClient: SQS.SQSClient) => {
  return {
    async sendErrorMessage(purposeError: SavePurposeErrorDto): Promise<void> {
      try {
        logger.info(
          `Error message sent on queue ${JSON.stringify(purposeError)}`,
        );
        await SQS.sendMessage(
          sqsClient,
          config.sqsProcessingErrorEndpoint,
          JSON.stringify(purposeError),
        );
      } catch (err) {
        const errorMsg = `Error in sendErrorMessage: ${err instanceof Error ? err.message : String(err)}`;
        throw genericInternalError(errorMsg);
      }
    },

    async handleMissingPurposes(
      errorPurposes: EnrichedPurpose[],
      tracing: TracingContent,
    ) {
      try {
        const errorMessagePromises = errorPurposes.map((record, index) => {
          const purposeError = {
            tracingId: tracing.tracingId,
            version: tracing.version,
            date: tracing.date,
            errorCode: "INVALID_FORMAL_CHECK",
            purposeId: record.purpose_id,
            message: record.error!,
            rowNumber: record.rowNumber,
            updateTracingState: index === errorPurposes.length - 1,
          };
          return this.sendErrorMessage(purposeError);
        });
        await Promise.all(errorMessagePromises);
      } catch (err) {
        const errorMsg = `Error in handleMissingPurposes: ${err instanceof Error ? err.message : String(err)}`;
        throw genericInternalError(errorMsg);
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
