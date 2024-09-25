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

export type ApiDeletePurposesErrorsHeaders = ZodiosHeaderParamsByPath<
  Api,
  "delete",
  "/tracings/errors"
>;

export type ApiDeleteErrorsPayload = ZodiosBodyByPath<
  Api,
  "delete",
  "/tracings/errors"
>;

export type ApiDeletePurposesErrorsResponse = ZodiosResponseByPath<
  Api,
  "delete",
  "/tracings/errors"
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

export type ApiGetTenantsWithMissingTracingsHeaders = ZodiosHeaderParamsByPath<
  Api,
  "get",
  "/tenants/tracings/missing"
>;

export type ApiGetTenantsWithMissingTracingsQuery = ZodiosQueryParamsByPath<
  Api,
  "get",
  "/tenants/tracings/missing"
>;

export type ApiGetTenantsWithMissingTracingsResponse = ZodiosResponseByPath<
  Api,
  "get",
  "/tenants/tracings/missing"
>;

export type ApiSaveMissingTracingHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tenants/:tenantId/tracings/missing"
>;

export type ApiSaveMissingTracingResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tenants/:tenantId/tracings/missing"
>;

export type ApiSaveMissingTracingPayload = ZodiosBodyByPath<
  Api,
  "post",
  "/tenants/:tenantId/tracings/missing"
>;

export type ApiSaveMissingTracingParams = ZodiosPathParamsByPath<
  Api,
  "post",
  "/tenants/:tenantId/tracings/missing"
>;

export type ApiSaveEserviceHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/eservices"
>;

export type ApiSaveEservicePayload = ZodiosBodyByPath<
  Api,
  "post",
  "/eservices"
>;

export type ApiSaveEserviceResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/eservices"
>;

export type ApiDeleteEserviceHeaders = ZodiosHeaderParamsByPath<
  Api,
  "delete",
  "/eservices/:eserviceId"
>;

export type ApiDeleteEserviceParams = ZodiosPathParamsByPath<
  Api,
  "delete",
  "/eservices/:eserviceId"
>;

export type ApiDeleteEserviceResponse = ZodiosResponseByPath<
  Api,
  "delete",
  "/eservices/:eserviceId"
>;

export type ApiSavePurposePayload = ZodiosBodyByPath<Api, "post", "/purposes">;

export type ApiSavePurposeResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/purposes"
>;

export type ApiSavePurposeHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/purposes"
>;

export type ApiDeletePurposeParams = ZodiosPathParamsByPath<
  Api,
  "delete",
  "/purposes/:purposeId"
>;

export type ApiSaveTenantHeaders = ZodiosHeaderParamsByPath<
  Api,
  "post",
  "/tenants"
>;

export type ApiSaveTenantPayload = ZodiosBodyByPath<Api, "post", "/tenants">;

export type ApiSaveTenantResponse = ZodiosResponseByPath<
  Api,
  "post",
  "/tenants"
>;

export type ApiDeleteTenantHeaders = ZodiosHeaderParamsByPath<
  Api,
  "delete",
  "/tenants/:tenantId"
>;

export type ApiDeleteTenantParams = ZodiosPathParamsByPath<
  Api,
  "delete",
  "/tenants/:tenantId"
>;

export type ApiDeleteTenantResponse = ZodiosResponseByPath<
  Api,
  "delete",
  "/tenants/:tenantId"
>;
