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
import { genericInternalError } from "pagopa-interop-tracing-models";

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

  operationsRouter.post("/tracings/submit", async (req, res) => {
    try {
      const authData = req.ctx.authData;
      if (!authData.purpose_id) {
        throw genericInternalError("purpose_id is missing");
      }
      console.log("purpose_id ", authData.purpose_id);
      const tenant_id = await operationsService.getTenantByPurposeId(
        authData.purpose_id,
      );
      const { tracingId, errors } = await operationsService.submitTracing({
        ...req.body,
        tenant_id,
        purpose_id: authData.purpose_id,
      });
      return res.status(200).json({ tracingId, errors }).end();
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
    "/tracings/:tracingId/versions/:version/errors",
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
      await operationsService.saveMissingTracing();
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
        await operationsService.deletePurposeErrors();
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
