import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiSavePurposeErrorResponse,
  ApiUpdateTracingStateResponse,
} from "pagopa-interop-tracing-operations-client";
import { genericLogger } from "pagopa-interop-tracing-commons";
import {
  errorProcessingSavePurposeError,
  errorProcessingUpdateTracingState,
} from "../model/domain/errors.js";
import { correlationIdToHeader } from "../model/headers.js";
import { v4 as uuidv4 } from "uuid";
import {
  SavePurposeErrorDto,
  UpdateTracingStateDto,
} from "pagopa-interop-tracing-models";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => {
  return {
    async updateTracingState(
      data: UpdateTracingStateDto,
    ): Promise<ApiSavePurposeErrorResponse> {
      try {
        await operationsApiClient.updateTracingState(
          {
            state: data.state,
          },
          {
            headers: { ...correlationIdToHeader(uuidv4()) },
            params: { tracingId: data.tracingId, version: data.version },
          },
        );

        genericLogger.info(
          `Updating tracing state to "${data.state}" for tracingId: ${data.tracingId}, version: ${data.version}`,
        );
      } catch (error: unknown) {
        throw errorProcessingUpdateTracingState(
          `Error updating tracingId: ${data.tracingId}, version: ${data.version}. Details: ${error}`,
        );
      }
    },
    async savePurposeError(
      data: SavePurposeErrorDto,
    ): Promise<ApiUpdateTracingStateResponse> {
      try {
        await operationsApiClient.savePurposeError(
          {
            purposeId: data.purposeId,
            errorCode: data.errorCode,
            message: data.message,
            rowNumber: data.rowNumber,
          },
          {
            headers: { ...correlationIdToHeader(uuidv4()) },
            params: { tracingId: data.tracingId, version: data.version },
          },
        );

        genericLogger.info(
          `Saving purpose error with purposeId ${data.purposeId} rowNumber ${data.rowNumber} for tracingId: ${data.tracingId}, version: ${data.version}`,
        );
      } catch (error: unknown) {
        throw errorProcessingSavePurposeError(
          `Error saving purpose error for tracingId: ${data.tracingId}. Details: ${error}`,
        );
      }
    },
    async triggerS3Copy(tracingId: string) {
      try {
        await operationsApiClient.triggerCopy(undefined, {
          headers: { ...correlationIdToHeader(uuidv4()) },
          params: { tracingId },
        });

        genericLogger.info(`Triggering s3 copy for tracingId: ${tracingId}`);
      } catch (error: unknown) {
        throw errorProcessingUpdateTracingState(
          `Error triggering copy: ${tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
