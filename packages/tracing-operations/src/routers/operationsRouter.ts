import { ZodiosEndpointDefinitions } from "@zodios/core";
import { ZodiosRouter } from "@zodios/express";
import {
  ZodiosContext,
  ExpressContext,
  initDB,
  logger,
} from "pagopa-interop-tracing-commons";
import { api } from "pagopa-interop-tracing-operations-client";
import { makeApiProblem } from "../model/domain/errors.js";
import { operationsServiceBuilder } from "../services/operationsService.js";
import { config } from "../utilities/config.js";
import { dbServiceBuilder } from "../services/db/dbService.js";
import { deleteServiceBuilder } from "../services/deleteService.js";
import { tenantServiceBuilder } from "../services/tenantService.js";

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
  const operationsService = operationsServiceBuilder(
    dbServiceBuilder(dbInstance),
  );
  const deleteService = deleteServiceBuilder(dbServiceBuilder(dbInstance));
  const tenantService = tenantServiceBuilder(dbServiceBuilder(dbInstance));

  operationsRouter.post("/tracings/submit", async (_req, res) => {
    try {
      await operationsService.submitTracing();
      return res.status(200).json().end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, logger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.post("/tracings/:tracingId/recover", async (_req, res) => {
    try {
      await operationsService.recoverTracing();
      return res.status(200).json().end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, logger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.post("/tracings/:tracingId/replace", async (_req, res) => {
    try {
      await operationsService.replaceTracing();
      return res.status(200).json().end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, logger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.post(
    "/tracings/:tracingId/versions/:version/state",
    async (_req, res) => {
      try {
        await operationsService.updateState();
        return res.status(200).json().end();
      } catch (error) {
        const errorRes = makeApiProblem(error, () => 500, logger);
        return res.status(errorRes.status).end();
      }
    },
  );

  operationsRouter.post(
    "/tracings/:tracingId/versions/:version/savePurposeError",
    async (_req, res) => {
      try {
        await operationsService.savePurposeError();
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, () => 500, logger);
        return res.status(errorRes.status).end();
      }
    },
  );

  operationsRouter.post("/tenants/:tenantId/missing", async (_req, res) => {
    try {
      await tenantService.saveMissingTracing();
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, logger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.delete(
    "/tracings/:tracingId/versions/:version/errors",
    async (_req, res) => {
      try {
        await deleteService.deleteErrors();
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, () => 500, logger);
        return res.status(errorRes.status).end();
      }
    },
  );

  operationsRouter.get("/tracings", async (_req, res) => {
    try {
      await operationsService.getTracings();
      return res.status(204).json({ results: [], totalCount: 0 }).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, logger);
      return res.status(errorRes.status).end();
    }
  });

  operationsRouter.get("/tracings/:tracingId/errors", async (_req, res) => {
    try {
      await operationsService.getTracingErrors();
      return res.status(204).json({ errors: [], totalCount: 0 }).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, () => 500, logger);
      return res.status(errorRes.status).end();
    }
  });

  return operationsRouter;
};

export default operationsRouter;
