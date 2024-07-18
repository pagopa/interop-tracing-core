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
  ApiGetTracingErrorsParams,
  ApiGetTracingErrorsQuery,
  ApiRecoverTracingParams,
  ApicancelTracingStateAndVersionParams,
  ApicancelTracingStateAndVersionPayload,
  ApicancelTracingStateAndVersionResponse,
  ApiSubmitTracingPayload,
  ApiReplaceTracingParams,
} from "pagopa-interop-tracing-operations-client";
import {
  ISODateFormat,
  Logger,
  genericLogger,
} from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";
import {
  PurposeErrorId,
  PurposeId,
  generateId,
  tracingRecoverCannotBeUpdated,
  tracingReplaceCannotBeUpdated,
  tracingNotFound,
  tracingState,
} from "pagopa-interop-tracing-models";
import {
  TracingErrorsContentResponse,
  TracingsContentResponse,
} from "../model/domain/tracing.js";
import { BucketService } from "./bucketService.js";
import { tracingCannotBeCancelled } from "../model/domain/errors.js";

export function operationsServiceBuilder(
  dbService: DBService,
  bucketService: BucketService,
) {
  return {
    async getTenantByPurposeId(purposeId: PurposeId): Promise<string> {
      return await dbService.getTenantByPurposeId(purposeId);
    },
    async submitTracing(
      payload: ApiSubmitTracingPayload & { tenantId: string },
      logger: Logger,
    ): Promise<ApiSubmitTracingResponse> {
      logger.info(
        `Submitting tracing with tenantId: ${payload.tenantId}, date: ${payload.date}`,
      );

      const tracing = await dbService.submitTracing({
        id: generateId(),
        tenant_id: payload.tenantId,
        date: payload.date,
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
        throw tracingRecoverCannotBeUpdated(params.tracingId);
      }

      await dbService.updateTracingStateAndVersion({
        tracing_id: params.tracingId,
        state: tracingState.pending,
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
    async replaceTracing(
      params: ApiReplaceTracingParams,
      logger: Logger,
    ): Promise<ApiReplaceTracingResponse> {
      logger.info(`Recover data for tracingId: ${params.tracingId}`);

      const tracing = await dbService.findTracingById(params.tracingId);
      if (!tracing) {
        throw tracingNotFound(params.tracingId);
      }

      if (tracing.state !== tracingState.completed) {
        throw tracingReplaceCannotBeUpdated(params.tracingId);
      }

      await dbService.updateTracingStateAndVersion({
        tracing_id: params.tracingId,
        state: tracingState.pending,
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

      await dbService.updateTracingStateAndVersion({
        tracing_id: params.tracingId,
        state: tracingState.pending,
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

    async triggerS3Copy(
      headers: ApiTriggerS3CopyHeaders,
      params: ApiTriggerS3CopyParams,
      logger: Logger,
    ): Promise<void> {
      logger.info(`Trigger S3 copy for tracingId: ${params.tracingId}`);

      const tracing = await dbService.findTracingById(params.tracingId);
      if (!tracing) {
        throw tracingNotFound(params.tracingId);
      }

      const bucketS3Key = buildS3Key(
        tracing.tenant_id,
        tracing.date,
        tracing.id,
        tracing.version,
        headers["x-correlation-id"],
      );

      return await bucketService.copyObject(bucketS3Key, logger);
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

    async getTracingErrors(
      filters: ApiGetTracingErrorsQuery,
      params: ApiGetTracingErrorsParams,
      logger: Logger,
    ): Promise<ApiGetTracingErrorsResponse> {
      logger.info(`Get purposes errors for tracingId: ${params.tracingId}`);

      const data = await dbService.getTracingErrors({
        ...filters,
        tracing_id: params.tracingId,
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

const buildS3Key = (
  tenantId: string,
  date: string,
  tracingId: string,
  version: number,
  correlationId: string,
): string =>
  `tenantId=${tenantId}/date=${ISODateFormat.parse(
    date,
  )}/tracingId=${tracingId}/version=${version}/correlationId=${correlationId}/${tracingId}.csv`;

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
