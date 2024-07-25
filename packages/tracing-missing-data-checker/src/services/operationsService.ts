import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiGetTenantsWithMissingTracingsHeaders,
  ApiGetTenantsWithMissingTracingsQuery,
  ApiGetTenantsWithMissingTracingsResponse,
  ApiSaveMissingTracingHeaders,
  ApiSaveMissingTracingParams,
  ApiSaveMissingTracingPayload,
  ApiSaveMissingTracingResponse,
} from "pagopa-interop-tracing-operations-client";
import {
  errorGetTenantsWithMissingTracings,
  errorSaveMissingTracing,
} from "../model/domain/errors.js";
import { Logger } from "pagopa-interop-tracing-commons";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => {
  return {
    async saveMissingTracing(
      headers: ApiSaveMissingTracingHeaders,
      params: ApiSaveMissingTracingParams,
      data: ApiSaveMissingTracingPayload,
      logger: Logger,
    ): Promise<ApiSaveMissingTracingResponse> {
      try {
        await operationsApiClient.saveMissingTracing(
          {
            date: data.date,
          },
          {
            headers,
            params,
          },
        );

        logger.info(
          `Missing tracing saved for date: ${data.date}, tenantId: ${params.tenantId}.`,
        );
      } catch (error: unknown) {
        throw errorSaveMissingTracing(
          `Error saving missing tracing for date: ${data.date}, tenantId: ${data.tenantId}. Details: ${error}`,
        );
      }
    },
    async getTenantsWithMissingTracings(
      headers: ApiGetTenantsWithMissingTracingsHeaders,
      filters: ApiGetTenantsWithMissingTracingsQuery,
      logger: Logger,
    ): Promise<ApiGetTenantsWithMissingTracingsResponse> {
      try {
        const results = await operationsApiClient.getTenantsWithMissingTracings(
          {
            queries: filters,
            headers,
          },
        );

        logger.info(
          `Get tenants with missing tracings for date: ${filters.date}.`,
        );

        return results;
      } catch (error: unknown) {
        throw errorGetTenantsWithMissingTracings(
          `Error get tenants with missing tracings for date: ${filters.date}. Details: ${error}`,
        );
      }
    },
  };
};

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
