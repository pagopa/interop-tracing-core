import {
  ZodiosBodyByPath,
  ZodiosQueryParamsByPath,
  ZodiosResponseByPath,
} from "@zodios/core";
import { api } from "./model/generated/client.js";

export type Api = typeof api.api;

export type ApiSubmitTracingPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/submit"
>;
export type ApiSubmitTracingResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/submit"
>;
export type ApiRecoverTracingPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/:tracingId/recover"
>;
export type ApiRecoverTracingResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/recover"
>;
export type ApiReplaceTracingPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/:tracingId/replace"
>;
export type ApiReplaceTracingResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/replace"
>;
export type ApiUpdateStatePayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/state"
>;
export type ApiUpdateStateResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/state"
>;
export type ApiSavePurposeErrorPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/savePurposeError"
>;
export type ApiSavePurposeErrorResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/savePurposeError"
>;
export type ApiSaveMissingTracingPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/state/saveMissingTracing"
>;
export type ApiSaveMissingTracingResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/state/saveMissingTracing"
>;
export type ApiDeletePurposeErrorPayload = ZodiosBodyByPath<
  Api,
  "delete",
  "/tracings/deletePurposesError"
>;
export type ApiDeletePurposeErrorResponse = ZodiosResponseByPath<
  Api,
  "delete",
  "/tracings/deletePurposesError"
>;

export type ApiGetTracingsPayload = ZodiosQueryParamsByPath<
  Api,
  "get",
  "/tracings"
>;
export type ApiGetTracingsResponse = ZodiosResponseByPath<
  Api,
  "get",
  "/tracings"
>;

export type ApiGetTracingErrorDetailParams = ZodiosQueryParamsByPath<
  Api,
  "get",
  "/tracings/:tracingId/errorDetails"
>;
export type ApiGetTracingErrorDetailResponse = ZodiosResponseByPath<
  Api,
  "get",
  "/tracings/:tracingId/errorDetails"
>;
