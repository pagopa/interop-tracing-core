import { SQS } from "pagopa-interop-tracing-commons";
import { OperationsService } from "./services/operationsService.js";
import {
  decodeSQSPurposeErrorMessage,
  decodeSQSUpdateTracingStateMessage,
} from "./model/models.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { tracingState } from "pagopa-interop-tracing-models";

export function processTracingStateMessage(
  service: OperationsService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    try {
      const updateTracingStateMessage =
        decodeSQSUpdateTracingStateMessage(message);

      if (updateTracingStateMessage.isReplacing) {
        await service.triggerS3Copy(updateTracingStateMessage.tracingId);
      }
      await service.updateTracingState(updateTracingStateMessage);
    } catch (e: unknown) {
      throw errorMapper(e);
    }
  };
}

export function processPurposeErrorMessage(
  service: OperationsService,
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    try {
      const purposeError = decodeSQSPurposeErrorMessage(message);
      await service.savePurposeError(purposeError);

      if (purposeError.updateTracingState) {
        await service.updateTracingState({
          tracingId: purposeError.tracingId,
          version: purposeError.version,
          state: tracingState.error,
        });
      }
    } catch (e: unknown) {
      throw errorMapper(e);
    }
  };
}
