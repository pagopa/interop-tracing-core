import {
  ZodiosBodyByPath,
  ZodiosPathParamsByPath,
  ZodiosQueryParamsByPath,
  ZodiosResponseByPath,
} from "@zodios/core";
import { api } from "./generated/api.js";

export type ApiExternal = typeof api.api;

export type ApiExternalSubmitTracingPayload = ZodiosBodyByPath<
  ApiExternal,
  "post",
  "/tracings/submit"
>;

export type ApiExternalSubmitTracingResponse = ZodiosResponseByPath<
  ApiExternal,
  "post",
  "/tracings/submit"
>;

export type ApiExternalGetTracingsQuery = ZodiosQueryParamsByPath<
  ApiExternal,
  "get",
  "/tracings"
>;

export type ApiExternalGetTracingsResponse = ZodiosResponseByPath<
  ApiExternal,
  "get",
  "/tracings"
>;

export type ApiExternalGetTracingErrorsResponse = ZodiosResponseByPath<
  ApiExternal,
  "get",
  "/tracings/:tracingId/errors"
>;

export type ApiExternalGetTracingErrorsQuery = ZodiosQueryParamsByPath<
  ApiExternal,
  "get",
  "/tracings/:tracingId/errors"
>;

export type ApiExternalGetTracingErrorsParams = ZodiosPathParamsByPath<
  ApiExternal,
  "get",
  "/tracings/:tracingId/errors"
>;

export type ApiExternalRecoverTracingPayload = ZodiosBodyByPath<
  ApiExternal,
  "post",
  "/tracings/:tracingId/recover"
>;

export type ApiExternalRecoverTracingResponse = ZodiosResponseByPath<
  ApiExternal,
  "post",
  "/tracings/:tracingId/recover"
>;

export type ApiExternalReplaceTracingPayload = ZodiosBodyByPath<
  ApiExternal,
  "post",
  "/tracings/:tracingId/replace"
>;

export type ApiExternalReplaceTracingResponse = ZodiosResponseByPath<
  ApiExternal,
  "post",
  "/tracings/:tracingId/replace"
>;
