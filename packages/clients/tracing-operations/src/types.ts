import {
  ZodiosBodyByPath,
  ZodiosHeaderParamsByPath,
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

export type ApiSubmitTracingHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tracings/submit"
>;

export type ApiSubmitTracingResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/submit"
>;

export type ApiRecoverTracingParams = ZodiosPathParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/recover"
>;

export type ApiRecoverTracingHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/recover"
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

export type ApiReplaceTracingParams = ZodiosPathParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/replace"
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

export type ApiReplaceTracingHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/replace"
>;

export type ApiUpdateTracingStatePayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/state"
>;

export type ApiUpdateTracingStateHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/state"
>;

export type ApiUpdateTracingStateParams = ZodiosPathParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/state"
>;

export type ApiUpdateTracingStateResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/versions/:version/state"
>;

export type ApiCancelTracingStateAndVersionParams = ZodiosPathParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/cancel"
>;

export type ApiCancelTracingStateAndVersionHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/cancel"
>;

export type ApiCancelTracingStateAndVersionPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/:tracingId/cancel"
>;

export type ApiCancelTracingStateAndVersionResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/cancel"
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

export type ApiSavePurposeErrorParams = ZodiosPathParamsByPath<
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

export type ApiGetTracingsHeaders = ZodiosHeaderParamsByPath<
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

export type ApiGetTracingErrorsHeaders = ZodiosHeaderParamsByPath<
  Api,
  "get",
  "/tracings/:tracingId/errors"
>;

export type ApiTriggerS3CopyParams = ZodiosPathParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/triggerCopy"
>;

export type ApiTriggerS3CopyResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tracings/:tracingId/triggerCopy"
>;

export type ApiTriggerS3CopyPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tracings/:tracingId/triggerCopy"
>;

export type ApiTriggerS3CopyHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tracings/:tracingId/triggerCopy"
>;
