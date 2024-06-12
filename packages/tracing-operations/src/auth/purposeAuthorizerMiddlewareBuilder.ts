import { Request } from "express";
import { z } from "zod";
import {
  Method,
  ZodiosEndpointDefinition,
  ZodiosPathsByMethod,
} from "@zodios/core";
import {
  AppContext,
  Middleware,
  genericLogger,
} from "pagopa-interop-tracing-commons";
import { readHeaders } from "./headers.js";
import { genericInternalError } from "pagopa-interop-tracing-models";
import { makeApiProblem } from "../model/domain/errors.js";
import { match } from "ts-pattern";
import { DBService } from "../services/db/dbService.js";

const purposeAuthorizerMiddleware =
  (dbService: DBService) =>
  <
    Api extends ZodiosEndpointDefinition[],
    M extends Method,
    Path extends ZodiosPathsByMethod<Api, M>,
    Context extends z.ZodObject<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  >(): Middleware<Api, M, Path, Context> =>
  async (req, res, next) => {
    const ctx = req.ctx as AppContext;
    const headers = readHeaders(req as Request);

    try {
      if (!headers?.purposeId) {
        throw genericInternalError(
          `No header requester purposedId found to execute this request ${req.method} ${req.url}`,
        );
      }

      const tenantId = await dbService.getTenantByPurposeId(headers.purposeId);
      if (!tenantId) {
        throw genericInternalError(
          `No related tenant found to execute this request ${req.method} ${req.url}`,
        );
      }

      ctx.operationsAuth = { tenantId };

      return next();
    } catch (error: unknown) {
      const problem = makeApiProblem(
        error,
        (err) =>
          match(err.code)
            .with("unauthorizedError", () => 401)
            .with("missingHeader", () => 400)
            .otherwise(() => 500),
        genericLogger,
      );

      return (
        res
          .status(problem.status)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion
          .json(problem as any)
          .end()
      );
    }
  };

export function purposeAuthorizerMiddlewareBuilder(dbService: DBService) {
  return {
    purposeAuthorizerMiddleware: purposeAuthorizerMiddleware(dbService),
  };
}

export type PurposeAuthorizationMiddleware = ReturnType<
  typeof purposeAuthorizerMiddlewareBuilder
>;
