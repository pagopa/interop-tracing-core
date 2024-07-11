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
  ApiCancelTracingVersionAndStatePayload,
  ApiCancelTracingVersionAndStateParams,
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

  async cancelTracingVersionAndState(
    params: ApiCancelTracingVersionAndStateParams,
    payload: ApiCancelTracingVersionAndStatePayload,
  ): Promise<void> {
    await operationsApiClient.cancelTracingVersionAndState(
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
