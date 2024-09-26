import {
  ApiGetTracingsResponse,
  ApiRecoverTracingResponse,
  ApiReplaceTracingResponse,
  ApiSavePurposeErrorResponse,
  ApiSubmitTracingResponse,
  ApiUpdateTracingStateResponse,
  ApiGetTracingErrorsResponse,
  ApiSavePurposeErrorPayload,
  ApiSavePurposeErrorParams,
  ApiUpdateTracingStateParams,
  ApiUpdateTracingStatePayload,
  ApiGetTracingsQuery,
  ApiGetTracingErrorsParams,
  ApiGetTracingErrorsQuery,
  ApiRecoverTracingParams,
  ApiCancelTracingStateAndVersionParams,
  ApiCancelTracingStateAndVersionPayload,
  ApiCancelTracingStateAndVersionResponse,
  ApiSubmitTracingPayload,
  ApiReplaceTracingParams,
  ApiGetTenantsWithMissingTracingsResponse,
  ApiGetTenantsWithMissingTracingsQuery,
  ApiSaveMissingTracingParams,
  ApiSaveMissingTracingPayload,
  ApiSaveMissingTracingResponse,
  ApiDeletePurposesErrorsResponse,
  ApiSavePurposePayload,
  ApiDeletePurposeParams,
  ApiSaveEservicePayload,
  ApiSaveEserviceResponse,
  ApiDeleteEserviceParams,
  ApiDeleteEserviceResponse,
  ApiSaveTenantPayload,
  ApiSaveTenantResponse,
  ApiDeleteTenantParams,
  ApiDeleteTenantResponse,
} from "pagopa-interop-tracing-operations-client";
import { Logger } from "pagopa-interop-tracing-commons";
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
import { tracingCannotBeCancelled } from "../model/domain/errors.js";

export function operationsServiceBuilder(dbService: DBService) {
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
        tracing.state !== tracingState.missing &&
        tracing.state !== tracingState.error
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
      params: ApiCancelTracingStateAndVersionParams,
      payload: ApiCancelTracingStateAndVersionPayload,
      logger: Logger,
    ): Promise<ApiCancelTracingStateAndVersionResponse> {
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
        purpose_id: payload.purposeId,
        error_code: payload.errorCode,
        message: payload.message,
        row_number: payload.rowNumber,
      });
    },

    async deletePurposesErrors(
      logger: Logger,
    ): Promise<ApiDeletePurposesErrorsResponse> {
      logger.info(`Delete purposes errors with old version`);

      await dbService.deletePurposesErrors();
    },

    async saveMissingTracing(
      params: ApiSaveMissingTracingParams,
      payload: ApiSaveMissingTracingPayload,
      logger: Logger,
    ): Promise<ApiSaveMissingTracingResponse> {
      logger.info(
        `Saving missing tracing for tenantId: ${params.tenantId}, date: ${payload.date}`,
      );

      await dbService.saveMissingTracing({
        id: generateId(),
        tenant_id: params.tenantId,
        date: payload.date,
        version: 1,
        state: tracingState.missing,
        errors: false,
      });
    },

    async getTenantsWithMissingTracings(
      filters: ApiGetTenantsWithMissingTracingsQuery,
      logger: Logger,
    ): Promise<ApiGetTenantsWithMissingTracingsResponse> {
      logger.info(`Get tenants with missing tracings for date ${filters.date}`);

      const data = await dbService.getTenantsWithMissingTracings(filters);

      return {
        results: data.results,
        totalCount: data.totalCount,
      };
    },

    async getTracings(
      filters: ApiGetTracingsQuery & { tenantId: string },
      logger: Logger,
    ): Promise<ApiGetTracingsResponse> {
      logger.info(`Get tracings by tenantId: ${filters.tenantId}`);

      const data = await dbService.getTracings({
        ...filters,
      });

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

    async saveEservice(
      payload: ApiSaveEservicePayload,
      logger: Logger,
    ): Promise<ApiSaveEserviceResponse> {
      logger.info(
        `Upsert eService with eserviceId: ${payload.eserviceId}, producerId: ${payload.producerId}`,
      );

      await dbService.saveEservice({
        eservice_id: payload.eserviceId,
        producer_id: payload.producerId,
        name: payload.name,
      });
    },

    async deleteEservice(
      params: ApiDeleteEserviceParams,
      logger: Logger,
    ): Promise<ApiDeleteEserviceResponse> {
      logger.info(`Delete eService with eserviceId: ${params.eserviceId}`);

      await dbService.deleteEservice({ eservice_id: params.eserviceId });
    },

    async saveTenant(
      payload: ApiSaveTenantPayload,
      logger: Logger,
    ): Promise<ApiSaveTenantResponse> {
      logger.info(`Upsert tenant with tenantId: ${payload.tenantId}`);

      await dbService.saveTenant({
        id: payload.tenantId,
        name: payload.name,
        origin: payload.origin,
        external_id: payload.externalId,
        deleted: false,
      });
    },

    async deleteTenant(
      params: ApiDeleteTenantParams,
      logger: Logger,
    ): Promise<ApiDeleteTenantResponse> {
      logger.info(`Delete tenant with tenantId: ${params.tenantId}`);

      await dbService.deleteTenant({ id: params.tenantId });
    },

    async savePurpose(purposePayload: ApiSavePurposePayload, logger: Logger) {
      logger.info(`Saving purpose with id ${purposePayload.id}`);

      return await dbService.savePurpose({
        id: purposePayload.id,
        eservice_id: purposePayload.eserviceId,
        consumer_id: purposePayload.consumerId,
        purpose_title: purposePayload.purposeTitle,
      });
    },

    async deletePurpose(params: ApiDeletePurposeParams, logger: Logger) {
      const purposeId = params.purposeId;
      logger.info(`Deleting purpose with id ${purposeId}`);
      return await dbService.deletePurpose(purposeId);
    },
  };
}

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
