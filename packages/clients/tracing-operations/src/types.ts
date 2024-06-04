import {
  ZodiosBodyByPath,
  ZodiosPathParamsByPath,
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
  "/tracings/:tracingId/versions/:version/errors"
>;
export type ApiSavePurposeErrorResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/errors"
>;
export type ApiMissingPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tenants/:tenantId/missing"
>;
export type ApiMissingResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tenants/:tenantId/missing"
>;
export type ApiDeleteErrorsPayload = ZodiosBodyByPath<
  Api,
  "delete",
  "/tracings/:tracingId/versions/:version/errors"
>;
export type ApiDeleteErrorsResponse = ZodiosResponseByPath<
  Api,
  "delete",
  "/tracings/:tracingId/versions/:version/errors"
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
export type ApiGetTracingsQuery = ZodiosQueryParamsByPath<
  Api,
  "get",
  "/tracings"
>;
export type ApiGetTracingErrorsQuery = ZodiosQueryParamsByPath<
  Api,
  "get",
  "/tracings/:tracingId/errors"
>;
export type ApiGetTracingErrorsResponse = ZodiosResponseByPath<
  Api,
  "get",
  "/tracings/:tracingId/errors"
>;
export type ApiGetTracingErrorsParams = ZodiosPathParamsByPath<
  Api,
  "get",
  "/tracings/:tracingId/errors"
>;
