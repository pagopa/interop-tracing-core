import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiGetTracingsResponse,
  ApiRecoverTracingResponse,
  ApiReplaceTracingResponse,
  ApiSubmitTracingPayload,
  ApiSubmitTracingResponse,
  ApiGetTracingsQuery,
  ApiGetTracingErrorsQuery,
  ApiGetTracingErrorsResponse,
} from "pagopa-interop-tracing-operations-client";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => ({
  async submitTracing(
    payload: ApiSubmitTracingPayload,
  ): Promise<ApiSubmitTracingResponse> {
    return await operationsApiClient.submitTracing(
      {
        date: payload.date,
      },
      {
        headers: {
          "X-Correlation-Id": "mockUuid",
          "X-Requester-Purpose-Id": "mockUuid",
        },
      },
    );
  },

  async getTracings(
    filters: ApiGetTracingsQuery,
  ): Promise<ApiGetTracingsResponse> {
    return await operationsApiClient.getTracings({
      queries: filters,
    });
  },

  async getTracingErrors(
    tracingId: string,
    filters: ApiGetTracingErrorsQuery,
  ): Promise<ApiGetTracingErrorsResponse> {
    return await operationsApiClient.getTracingErrors({
      queries: filters,
      params: { tracingId },
    });
  },

  async recoverTracing(tracingId: string): Promise<ApiRecoverTracingResponse> {
    return await operationsApiClient.recoverTracing(undefined, {
      params: { tracingId },
    });
  },

  async replaceTracing(tracingId: string): Promise<ApiReplaceTracingResponse> {
    return await operationsApiClient.replaceTracing(undefined, {
      params: { tracingId },
    });
  },
});

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
