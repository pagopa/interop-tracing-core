import {
  ApiGetTracingsResponse,
  ApiRecoverTracingResponse,
  ApiReplaceTracingResponse,
  ApiSavePurposeErrorResponse,
  ApiSubmitTracingResponse,
  ApiUpdateTracingStateResponse,
  ApiMissingResponse,
  ApiGetTracingErrorsResponse,
  ApiSavePurposeErrorPayload,
  ApiSavePurposeErrorParams,
  ApiUpdateTracingStateParams,
  ApiUpdateTracingStatePayload,
} from "pagopa-interop-tracing-operations-client";
import { Logger, genericLogger } from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";
import {
  PurposeId,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { PurposeError, UpdateTracingState } from "../model/domain/db.js";

export function operationsServiceBuilder(dbService: DBService) {
  return {
    async getTenantByPurposeId(purposeId: PurposeId): Promise<string> {
      return await dbService.getTenantByPurposeId(purposeId);
    },
    async submitTracing(
      data: {
        tenantId: string;
        date: string;
      },
      logger: Logger,
    ): Promise<ApiSubmitTracingResponse> {
      logger.info(
        `Submitting tracing with tenantId: ${data.tenantId}, date: ${data.date}`,
      );

      const tracing = await dbService.submitTracing({
        id: generateId(),
        tenant_id: data.tenantId,
        date: data.date,
        version: 1,
        state: tracingState.pending,
        errors: false,
      });

      return {
        tracingId: tracing.tracingId,
        tenantId: tracing.tenantId,
        version: tracing.version,
        date: tracing.date,
        state: tracing.state,
        errors: tracing.errors,
      };
    },
    async recoverTracing(): Promise<ApiRecoverTracingResponse> {
      genericLogger.info(`Recover tracing`);
      await dbService.recoverTracing();
      return Promise.resolve({});
    },

    async replaceTracing(): Promise<ApiReplaceTracingResponse> {
      genericLogger.info(`Replacing tracing`);
      await dbService.replaceTracing();
      return Promise.resolve({});
    },

    async updateTracingState(
      params: ApiUpdateTracingStateParams,
      payload: ApiUpdateTracingStatePayload,
      logger: Logger,
    ): Promise<ApiUpdateTracingStateResponse> {
      logger.info(
        `Update state for tracingId: ${params.tracingId}, version: ${params.version}`,
      );

      const updateTracingState: UpdateTracingState = {
        tracing_id: params.tracingId,
        state: payload.state,
      };

      await dbService.updateTracingState(updateTracingState);
    },

    async savePurposeError(
      params: ApiSavePurposeErrorParams,
      payload: ApiSavePurposeErrorPayload,
      logger: Logger,
    ): Promise<ApiSavePurposeErrorResponse> {
      logger.info(
        `Save purpose error for tracingId: ${params.tracingId}, version: ${params.version}`,
      );

      const purposeError: PurposeError = {
        id: generateId<PurposeId>(),
        tracing_id: params.tracingId,
        version: params.version,
        purpose_id: payload.purposeId,
        error_code: payload.errorCode,
        message: payload.message,
        row_number: payload.rowNumber,
      };

      await dbService.savePurposeError(purposeError);
    },

    async deletePurposeErrors(): Promise<void> {
      genericLogger.info(`Delete purpose error`);
      await dbService.deletePurposeErrors();
      return Promise.resolve();
    },

    async saveMissingTracing(): Promise<ApiMissingResponse> {
      genericLogger.info(`Saving missing tracing`);
      await dbService.saveMissingTracing();
      return Promise.resolve();
    },

    async getTracings(): Promise<ApiGetTracingsResponse> {
      genericLogger.info(`Get tracings`);
      await dbService.getTracings();
      return Promise.resolve({ results: [], totalCount: 0 });
    },

    async getTracingErrors(): Promise<ApiGetTracingErrorsResponse> {
      genericLogger.info(`Get error detail`);
      await dbService.getTracingErrors();
      return Promise.resolve({
        errors: [],
        totalCount: 0,
      });
    },
  };
}

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
