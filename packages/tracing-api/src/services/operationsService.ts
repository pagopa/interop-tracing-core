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
  ApicancelTracingStateAndVersionPayload,
  ApicancelTracingStateAndVersionParams,
  ApiRecoverTracingParams,
  ApiGetTracingErrorsParams,
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
    params: ApicancelTracingStateAndVersionParams,
    payload: ApicancelTracingStateAndVersionPayload,
  ): Promise<void> {
    await operationsApiClient.cancelTracingStateAndVersion(
      {
        state: payload.state,
        version: payload.version,
      },
      {
        params: { tracingId: params.tracingId },
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
    params: ApiGetTracingErrorsParams,
    filters: ApiGetTracingErrorsQuery,
  ): Promise<ApiGetTracingErrorsResponse> {
    return await operationsApiClient.getTracingErrors({
      queries: filters,
      params: { tracingId: params.tracingId },
    });
  },

  async recoverTracing(
    params: ApiRecoverTracingParams,
  ): Promise<ApiRecoverTracingResponse> {
    return await operationsApiClient.recoverTracing(undefined, {
      params: { tracingId: params.tracingId },
    });
  },

  async replaceTracing(tracingId: string): Promise<ApiReplaceTracingResponse> {
    return await operationsApiClient.replaceTracing(undefined, {
      params: { tracingId },
    });
  },
});

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
