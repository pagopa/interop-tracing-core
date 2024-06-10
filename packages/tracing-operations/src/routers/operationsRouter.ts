import { ZodiosEndpointDefinitions } from "@zodios/core";
import { ZodiosRouter } from "@zodios/express";
import {
  ZodiosContext,
  ExpressContext,
  initDB,
  genericLogger,
} from "pagopa-interop-tracing-commons";
import { api } from "pagopa-interop-tracing-operations-client";
import { makeApiProblem } from "../model/domain/errors.js";
import { operationsServiceBuilder } from "../services/operationsService.js";
import { config } from "../utilities/config.js";
import { dbServiceBuilder } from "../services/db/dbService.js";
import { purposeAuthorizerMiddlewareBuilder } from "../auth/purposeAuthorizerMiddlewareBuilder.js";

const operationsRouter = (
  ctx: ZodiosContext,
): ZodiosRouter<ZodiosEndpointDefinitions, ExpressContext> => {
  const dbInstance = initDB({
    username: config.dbUsername,
    password: config.dbPassword,
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    schema: config.schemaName,
    useSSL: config.dbUseSSL,
  });

  const operationsRouter = ctx.router(api.api);
  const dbService = dbServiceBuilder(dbInstance);
  const operationsService = operationsServiceBuilder(dbService);
  const { purposeAuthorizerMiddleware } =
    purposeAuthorizerMiddlewareBuilder(dbService);

  operationsRouter.post(
    "/tracings/submit",
    purposeAuthorizerMiddleware(),
    async (req, res) => {
      try {
        genericLogger.info(`${req.method} ${req.url}`);

        const tracing = await operationsService.submitTracing({
          ...req.body,
          tenantId: req.ctx.operationsAuth.tenantId,
        });

        return res.status(200).json(tracing).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, () => 500, genericLogger);
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post("/tracings/:tracingId/recover", async (_req, res) => {
    try {
      await operationsService.recoverTracing();
      return res.status(200).json().end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, genericLogger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.post("/tracings/:tracingId/replace", async (_req, res) => {
    try {
      await operationsService.replaceTracing();
      return res.status(200).json().end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, genericLogger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.post(
    "/tracings/:tracingId/versions/:version/state",
    async (_req, res) => {
      try {
        await operationsService.updateTracingState();
        return res.status(200).json().end();
      } catch (error) {
        const errorRes = makeApiProblem(error, () => 500, genericLogger);
        return res.status(errorRes.status).end();
      }
    },
  );

  operationsRouter.post(
    "/tracings/:tracingId/versions/:version/errors",
    async (_req, res) => {
      try {
        await operationsService.savePurposeError();
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, () => 500, genericLogger);
        return res.status(errorRes.status).end();
      }
    },
  );

  operationsRouter.post("/tenants/:tenantId/missing", async (_req, res) => {
    try {
      await operationsService.saveMissingTracing();
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, genericLogger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.delete(
    "/tracings/:tracingId/versions/:version/errors",
    async (_req, res) => {
      try {
        await operationsService.deletePurposeErrors();
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, () => 500, genericLogger);
        return res.status(errorRes.status).end();
      }
    },
  );

  operationsRouter.get("/tracings", async (_req, res) => {
    try {
      await operationsService.getTracings();
      return res.status(204).json({ results: [], totalCount: 0 }).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, genericLogger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.get("/tracings/:tracingId/errors", async (_req, res) => {
    try {
      await operationsService.getTracingErrors();
      return res.status(204).json({ errors: [], totalCount: 0 }).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, genericLogger);
      return res.status(errorRes.status).end();
    }
  });

  return operationsRouter;
};

export default operationsRouter;
