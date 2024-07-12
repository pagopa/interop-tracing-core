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
  ApiTriggerS3CopyParams,
  ApiTriggerS3CopyHeaders,
} from "pagopa-interop-tracing-operations-client";
import { Logger, genericLogger } from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";
import {
  PurposeErrorId,
  PurposeId,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { PurposeError } from "../model/domain/db.js";
import { TracingsContentResponse } from "../model/domain/tracing.js";
import { BucketService } from "./bucketService.js";
import { tracingNotFound } from "../model/domain/errors.js";

export function operationsServiceBuilder(
  dbService: DBService,
  bucketService: BucketService,
) {
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

      const purposeError: PurposeError = {
        id: generateId<PurposeErrorId>(),
        tracing_id: params.tracingId,
        version: params.version,
        purpose_id: payload.purposeId as PurposeId,
        error_code: payload.errorCode,
        message: payload.message,
        row_number: payload.rowNumber,
      };

      await dbService.savePurposeError(purposeError);
    },

    async triggerS3Copy(
      params: ApiTriggerS3CopyParams,
      headers: ApiTriggerS3CopyHeaders,
      logger: Logger,
    ): Promise<void> {
      logger.info(`trigger s3 copy for tracingId: ${params.tracingId}`);

      const tracing = await dbService.findTracingById(params.tracingId);
      if (!tracing) {
        throw tracingNotFound(params.tracingId);
      }

      return await bucketService.copyObject(
        tracing,
        headers["X-Correlation-Id"],
      );
    },

    async deletePurposeErrors(): Promise<void> {},

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
