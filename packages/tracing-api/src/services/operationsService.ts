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
  ApiSubmitTracingHeaders,
  ApiUpdateTracingStateHeaders,
  ApiCancelTracingStateAndVersionPayload,
  ApiCancelTracingStateAndVersionParams,
  ApiCancelTracingStateAndVersionHeaders,
  ApiRecoverTracingParams,
  ApiGetTracingErrorsParams,
  ApiGetTracingsHeaders,
  ApiRecoverTracingHeaders,
  ApiReplaceTracingHeaders,
  ApiReplaceTracingParams,
  ApiGetTracingErrorsHeaders,
} from "pagopa-interop-tracing-operations-client";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => ({
  async submitTracing(
    headers: ApiSubmitTracingHeaders,
    payload: ApiSubmitTracingPayload,
  ): Promise<ApiSubmitTracingResponse> {
    return await operationsApiClient.submitTracing(
      {
        date: payload.date,
      },
      {
        headers,
      },
    );
  },

  async updateTracingState(
    headers: ApiUpdateTracingStateHeaders,
    params: ApiUpdateTracingStateParams,
    payload: ApiUpdateTracingStatePayload,
  ): Promise<void> {
    await operationsApiClient.updateTracingState(
      {
        state: payload.state,
      },
      {
        headers,
        params: { tracingId: params.tracingId, version: params.version },
      },
    );
  },

  async cancelTracingStateAndVersion(
    headers: ApiCancelTracingStateAndVersionHeaders,
    params: ApiCancelTracingStateAndVersionParams,
    payload: ApiCancelTracingStateAndVersionPayload,
  ): Promise<void> {
    await operationsApiClient.cancelTracingStateAndVersion(
      {
        state: payload.state,
        version: payload.version,
      },
      {
        headers,
        params: { tracingId: params.tracingId },
      },
    );
  },

  async getTracings(
    headers: ApiGetTracingsHeaders,
    filters: ApiGetTracingsQuery,
  ): Promise<ApiGetTracingsResponse> {
    return await operationsApiClient.getTracings({
      queries: filters,
      headers,
    });
  },

  async getTracingErrors(
    headers: ApiGetTracingErrorsHeaders,
    params: ApiGetTracingErrorsParams,
    filters: ApiGetTracingErrorsQuery,
  ): Promise<ApiGetTracingErrorsResponse> {
    return await operationsApiClient.getTracingErrors({
      queries: filters,
      params: { tracingId: params.tracingId },
      headers,
    });
  },

  async recoverTracing(
    headers: ApiRecoverTracingHeaders,
    params: ApiRecoverTracingParams,
  ): Promise<ApiRecoverTracingResponse> {
    return await operationsApiClient.recoverTracing(undefined, {
      params: { tracingId: params.tracingId },
      headers,
    });
  },

  async replaceTracing(
    headers: ApiReplaceTracingHeaders,
    params: ApiReplaceTracingParams,
  ): Promise<ApiReplaceTracingResponse> {
    return await operationsApiClient.replaceTracing(undefined, {
      params: { tracingId: params.tracingId },
      headers,
    });
  },
});

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
