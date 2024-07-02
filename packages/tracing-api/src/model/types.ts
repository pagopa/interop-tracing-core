import {
  ZodiosBodyByPath,
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

export type ApiExternalRecoverTracingPayload = ZodiosBodyByPath<
  ApiExternal,
  "put",
  "/tracings/:tracingId/recover"
>;

export type ApiExternalRecoverTracingResponse = ZodiosResponseByPath<
  ApiExternal,
  "put",
  "/tracings/:tracingId/recover"
>;

export type ApiExternalReplaceTracingPayload = ZodiosBodyByPath<
  ApiExternal,
  "put",
  "/tracings/:tracingId/replace"
>;

export type ApiExternalReplaceTracingResponse = ZodiosResponseByPath<
  ApiExternal,
  "put",
  "/tracings/:tracingId/replace"
>;
