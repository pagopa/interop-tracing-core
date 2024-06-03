import {
  ApiGetTracingsResponse,
  ApiRecoverTracingResponse,
  ApiReplaceTracingResponse,
  ApiSaveMissingTracingResponse,
  ApiSavePurposeErrorResponse,
  ApiSubmitTracingResponse,
  ApiUpdateStateResponse,
  ApiGetTracingErrorDetailResponse,
} from "pagopa-interop-tracing-operations-client";
import { logger } from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";

export function operationsServiceBuilder(dbService: DBService) {
  return {
    async getTenantByPurposeId(): Promise<string> {
      logger.info("Get tenant id by purpose");
      await dbService.getTenantByPurposeId();
      return Promise.resolve("");
    },
    async submitTracing(): Promise<ApiSubmitTracingResponse> {
      logger.info(`Submitting tracing`);
      await dbService.submitTracing();
      return Promise.resolve({});
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
    async deletePurposesError(): Promise<void> {
      logger.info(`Delete purpose error`);
      await dbService.deletePurposesError();
      return Promise.resolve();
    },

    async saveMissingTracing(): Promise<ApiSaveMissingTracingResponse> {
      logger.info(`Saving missing tracing`);
      return Promise.resolve();
    },

    async getTracings(): Promise<ApiGetTracingsResponse> {
      logger.info(`Get tracings`);
      await dbService.getTracings();
      return Promise.resolve({ results: [] });
    },

    async getTracingErrorDetails(): Promise<ApiGetTracingErrorDetailResponse> {
      logger.info(`Get error detail`);
      await dbService.getTracingErrorDetails();
      return Promise.resolve({
        errors: [],
      });
    },
  };
}

export type OperationService = ReturnType<typeof operationsServiceBuilder>;
