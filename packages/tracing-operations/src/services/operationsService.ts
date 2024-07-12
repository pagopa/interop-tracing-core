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
  ApiGetTracingsQuery,
  ApiGetTracingErrorsParams,
  ApiGetTracingErrorsQuery,
  ApiRecoverTracingParams,
  ApicancelTracingStateAndVersionParams,
  ApicancelTracingStateAndVersionPayload,
  ApicancelTracingStateAndVersionResponse,
} from "pagopa-interop-tracing-operations-client";
import { Logger, genericLogger } from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";
import {
  PurposeErrorId,
  PurposeId,
  TracingId,
  generateId,
  tracingCannotBeUpdated,
  tracingNotFound,
  tracingState,
} from "pagopa-interop-tracing-models";
import {
  TracingErrorsContentResponse,
  TracingsContentResponse,
} from "../model/domain/tracing.js";
import { tracingCannotBeCancelled } from "../model/domain/errors.js";

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
        tracingId: tracing.id,
        tenantId: tracing.tenant_id,
        version: tracing.version,
        date: tracing.date,
        state: tracing.state,
        errors: tracing.errors,
      };
    },

    async recoverTracing(
      params: ApiRecoverTracingParams,
      logger: Logger,
    ): Promise<ApiRecoverTracingResponse> {
      logger.info(`Recover data for tracingId: ${params.tracingId}`);

      const tracing = await dbService.findTracingById(params.tracingId);
      if (!tracing) {
        throw tracingNotFound(params.tracingId);
      }

      if (
        tracing.state === tracingState.completed ||
        tracing.state === tracingState.pending
      ) {
        throw tracingCannotBeUpdated(params.tracingId);
      }

      await dbService.updateTracingState({
        tracing_id: params.tracingId,
        state: tracingState.pending,
      });

      await dbService.updateTracingVersion({
        tracing_id: params.tracingId,
        version: tracing.version + 1,
      });

      return {
        tracingId: tracing.id,
        tenantId: tracing.tenant_id,
        version: tracing.version + 1,
        date: tracing.date,
        previousState: tracing.state,
      };
    },

    async replaceTracing(): Promise<ApiReplaceTracingResponse> {
      genericLogger.info(`Replacing tracing`);
      await dbService.replaceTracing();
      return Promise.resolve({});
    },

    async cancelTracingStateAndVersion(
      params: ApicancelTracingStateAndVersionParams,
      payload: ApicancelTracingStateAndVersionPayload,
      logger: Logger,
    ): Promise<ApicancelTracingStateAndVersionResponse> {
      logger.info(
        `Cancel tracing to previous version with tracingId: ${params.tracingId}`,
      );

      const tracing = await dbService.findTracingById(params.tracingId);
      if (!tracing) {
        throw tracingNotFound(params.tracingId);
      }

      if (tracing.state !== tracingState.pending) {
        throw tracingCannotBeCancelled(params.tracingId);
      }

      await dbService.updateTracingState({
        tracing_id: params.tracingId,
        state: payload.state,
      });

      await dbService.updateTracingVersion({
        tracing_id: params.tracingId,
        version: payload.version,
      });
    },

    async updateTracingState(
      params: ApiUpdateTracingStateParams,
      payload: ApiUpdateTracingStatePayload,
      logger: Logger,
    ): Promise<ApiUpdateTracingStateResponse> {
      logger.info(
        `Update state for tracingId: ${params.tracingId}, version: ${params.version}`,
      );

      await dbService.updateTracingState({
        tracing_id: params.tracingId,
        state: payload.state,
      });
    },

    async savePurposeError(
      params: ApiSavePurposeErrorParams,
      payload: ApiSavePurposeErrorPayload,
      logger: Logger,
    ): Promise<ApiSavePurposeErrorResponse> {
      logger.info(
        `Save purpose error for tracingId: ${params.tracingId}, version: ${params.version}`,
      );

      await dbService.savePurposeError({
        id: generateId<PurposeErrorId>(),
        tracing_id: params.tracingId,
        version: params.version,
        purpose_id: payload.purposeId as PurposeId,
        error_code: payload.errorCode,
        message: payload.message,
        row_number: payload.rowNumber,
      });
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

    async getTracings(
      filters: ApiGetTracingsQuery,
      logger: Logger,
    ): Promise<ApiGetTracingsResponse> {
      logger.info(`Get tracings`);

      const data = await dbService.getTracings(filters);

      const parsedTracings = TracingsContentResponse.safeParse(data.results);
      if (!parsedTracings.success) {
        throw new Error(
          `Unable to parse tracings items: result ${JSON.stringify(
            parsedTracings,
          )} - data ${JSON.stringify(data.results)}`,
        );
      }

      return {
        results: parsedTracings.data,
        totalCount: data.totalCount,
      };
    },

    async getTracingErrors(
      filters: ApiGetTracingErrorsQuery,
      params: ApiGetTracingErrorsParams,
      logger: Logger,
    ): Promise<ApiGetTracingErrorsResponse> {
      logger.info(`Get purposes errors for tracingId: ${params.tracingId}`);

      const data = await dbService.getTracingErrors({
        ...filters,
        tracing_id: params.tracingId as TracingId,
      });

      const parsedTracingErrors = TracingErrorsContentResponse.safeParse(
        data.results,
      );
      if (!parsedTracingErrors.success) {
        throw new Error(
          `Unable to parse tracing purposes errors items: result ${JSON.stringify(
            parsedTracingErrors,
          )} - data ${JSON.stringify(data.results)}`,
        );
      }

      return {
        results: parsedTracingErrors.data,
        totalCount: data.totalCount,
      };
    },
  };
}

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
