import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiSavePurposeErrorResponse,
  ApiUpdateTracingStateResponse,
} from "pagopa-interop-tracing-operations-client";
import {
  AppContext,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import {
  errorProcessingSavePurposeError,
  errorProcessingUpdateTracingState,
} from "../model/domain/errors.js";
import {
  SavePurposeErrorDto,
  UpdateTracingStateDto,
  correlationIdToHeader,
} from "pagopa-interop-tracing-models";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => {
  return {
    async updateTracingState(
      data: UpdateTracingStateDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<ApiSavePurposeErrorResponse> {
      try {
        await operationsApiClient.updateTracingState(
          {
            state: data.state,
          },
          {
            headers: { ...correlationIdToHeader(ctx.correlationId) },
            params: { tracingId: data.tracingId, version: data.version },
          },
        );

        logger(ctx).info(
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
      ctx: WithSQSMessageId<AppContext>,
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
            headers: { ...correlationIdToHeader(ctx.correlationId) },
            params: { tracingId: data.tracingId, version: data.version },
          },
        );

        logger(ctx).info(
          `Saving purpose error with purposeId ${data.purposeId} rowNumber ${data.rowNumber} for tracingId: ${data.tracingId}, version: ${data.version}`,
        );
      } catch (error: unknown) {
        throw errorProcessingSavePurposeError(
          `Error saving purpose error for tracingId: ${data.tracingId}. Details: ${error}`,
        );
      }
    },
  };
};

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
