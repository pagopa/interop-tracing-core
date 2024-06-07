import {
  ApiGetTracingsResponse,
  ApiRecoverTracingResponse,
  ApiReplaceTracingResponse,
  ApiSavePurposeErrorResponse,
  ApiSubmitTracingResponse,
  ApiUpdateStateResponse,
  ApiMissingResponse,
  ApiGetTracingErrorsResponse,
} from "pagopa-interop-tracing-operations-client";
import { logger } from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";
import { tracingState } from "pagopa-interop-tracing-models";
import { v4 as uuidv4 } from "uuid";
export function operationsServiceBuilder(dbService: DBService) {
  return {
    async getTenantByPurposeId(purposeId: string): Promise<string> {
      const tenant = await dbService.getTenantByPurposeId(purposeId);
      return tenant;
    },
    async submitTracing({
      tenant_id,
      date,
      purpose_id,
    }: {
      tenant_id: string;
      date: string;
      purpose_id: string;
    }): Promise<ApiSubmitTracingResponse> {
      logger.info(`Submitting tracing, tenant: ${tenant_id}, date: ${date}`);

      const resultSubmit = await dbService.submitTracing({
        id: uuidv4(),
        tenant_id,
        date,
        version: 1,
        state: tracingState.pending,
        errors: false,
        purpose_id: purpose_id,
      });
      return {
        tracingId: resultSubmit.tracing_id,
        errors: resultSubmit.errors,
        tenant_id: resultSubmit.tenant_id,
        version: resultSubmit.version,
        date: resultSubmit.date,
        state: resultSubmit.state,
      };
    },

    async recoverTracing(): Promise<ApiRecoverTracingResponse> {
      logger.info(`Recover tracing`);
      await dbService.recoverTracing();
      return Promise.resolve({});
    },

    async replaceTracing(): Promise<ApiReplaceTracingResponse> {
      logger.info(`Replacing tracing`);
      await dbService.replaceTracing();
      return Promise.resolve({});
    },

    async updateState(): Promise<ApiUpdateStateResponse> {
      logger.info(`Updating state of tracing`);
      await dbService.updateState();
      return Promise.resolve();
    },

    async savePurposeError(): Promise<ApiSavePurposeErrorResponse> {
      logger.info(`Save purpose error`);
      await dbService.savePurposeError();
      return Promise.resolve();
    },

    async deletePurposeErrors(): Promise<void> {
      logger.info(`Delete purpose error`);
      await dbService.deletePurposeErrors();
      return Promise.resolve();
    },

    async saveMissingTracing(): Promise<ApiMissingResponse> {
      logger.info(`Saving missing tracing`);
      await dbService.saveMissingTracing();
      return Promise.resolve();
    },

    async getTracings(): Promise<ApiGetTracingsResponse> {
      logger.info(`Get tracings`);
      await dbService.getTracings();
      return Promise.resolve({ results: [], totalCount: 0 });
    },

    async getTracingErrors(): Promise<ApiGetTracingErrorsResponse> {
      logger.info(`Get error detail`);
      await dbService.getTracingErrors();
      return Promise.resolve({
        errors: [],
        totalCount: 0,
      });
    },
  };
}

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
