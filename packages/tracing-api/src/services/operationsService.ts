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
  ApiUpdateTracingStatePayload,
  ApiUpdateTracingStateParams,
} from "pagopa-interop-tracing-operations-client";

const getHeaders = (correlationId: string, purposeId: string) => ({
  "X-Correlation-Id": correlationId,
  "X-Requester-Purpose-Id": purposeId,
});

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => ({
  async submitTracing(
    headers: { purposeId: string; correlationId: string },
    payload: ApiSubmitTracingPayload,
  ): Promise<ApiSubmitTracingResponse> {
    return await operationsApiClient.submitTracing(
      {
        date: payload.date,
      },
      {
        headers: getHeaders(headers.correlationId, headers.purposeId),
      },
    );
  },

  async updateTracingState(
    headers: { purposeId: string; correlationId: string },
    params: ApiUpdateTracingStateParams,
    payload: ApiUpdateTracingStatePayload,
  ): Promise<void> {
    await operationsApiClient.updateTracingState(
      {
        state: payload.state,
      },
      {
        headers: getHeaders(headers.correlationId, headers.purposeId),
        params: { tracingId: params.tracingId, version: params.version },
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
