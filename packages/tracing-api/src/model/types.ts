import {
  ZodiosBodyByPath,
  ZodiosQueryParamsByPath,
  ZodiosResponseByPath,
} from "@zodios/core";
import { api } from "./generated/api.js";

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

export type ApiGetTracingsQuery = ZodiosQueryParamsByPath<
  Api,
  "get",
  "/tracings"
>;

export type ApiGetTracingsResponse = ZodiosResponseByPath<
  Api,
  "get",
  "/tracings"
>;

export type ApiGetTracingErrorsResponse = ZodiosResponseByPath<
  Api,
  "get",
  "/tracings/:tracingId/errors"
>;

export type ApiRecoverTracingPayload = ZodiosBodyByPath<
  Api,
  "put",
  "/tracings/:tracingId/recover"
>;

export type ApiRecoverTracingResponse = ZodiosResponseByPath<
  Api,
  "put",
  "/tracings/:tracingId/recover"
>;

export type ApiReplaceTracingPayload = ZodiosBodyByPath<
  Api,
  "put",
  "/tracings/:tracingId/replace"
>;

export type ApiReplaceTracingResponse = ZodiosResponseByPath<
  Api,
  "put",
  "/tracings/:tracingId/replace"
>;
