import { ZodiosEndpointDefinitions } from "@zodios/core";
import { ZodiosRouter } from "@zodios/express";
import {
  initDB,
  logger,
  zodiosValidationErrorToApiProblem,
} from "pagopa-interop-tracing-commons";
import { api } from "pagopa-interop-tracing-operations-client";
import { makeApiProblem } from "../model/domain/errors.js";
import { operationsServiceBuilder } from "../services/operationsService.js";
import { config } from "../utilities/config.js";
import { dbServiceBuilder } from "../services/db/dbService.js";
import { errorMapper } from "../utilities/errorMapper.js";
import { LocalExpressContext, LocalZodiosContext } from "../context/index.js";
import { tenantAuthorizerMiddlewareBuilder } from "../auth/tenantAuthorizerMiddlewareBuilder.js";

const operationsRouter = (
  ctx: LocalZodiosContext,
): ZodiosRouter<ZodiosEndpointDefinitions, LocalExpressContext> => {
  const dbInstance = initDB({
    username: config.dbUsername,
    password: config.dbPassword,
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    schema: config.dbSchemaName,
    useSSL: config.dbUseSSL,
  });
  const operationsRouter = ctx.router(api.api, {
    validationErrorHandler: zodiosValidationErrorToApiProblem,
  });

  const dbService = dbServiceBuilder(dbInstance);
  const operationsService = operationsServiceBuilder(dbService);
  const { tenantAuthorizerMiddleware } =
    tenantAuthorizerMiddlewareBuilder(dbService);

  operationsRouter.post(
    "/tracings/submit",
    tenantAuthorizerMiddleware(),
    async (req, res) => {
      try {
        const tracing = await operationsService.submitTracing(
          {
            ...req.body,
            tenantId: req.ctx.authData.tenantId,
          },
          logger(req.ctx),
        );

        return res.status(200).json(tracing).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post("/eservices", async (req, res) => {
    try {
      const eservice = await operationsService.saveEservice(
        req.body,
        logger(req.ctx),
      );

      return res.status(204).json(eservice).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.delete("/eservices/:eserviceId", async (req, res) => {
    try {
      await operationsService.deleteEservice(req.params, logger(req.ctx));
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.post(
    "/tracings/:tracingId/recover",
    tenantAuthorizerMiddleware(),
    async (req, res) => {
      try {
        const tracing = await operationsService.recoverTracing(
          req.params,
          logger(req.ctx),
        );
        return res.status(200).json(tracing).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post(
    "/tracings/:tracingId/cancel",
    tenantAuthorizerMiddleware(),
    async (req, res) => {
      try {
        await operationsService.cancelTracingStateAndVersion(
          req.params,
          req.body,
          logger(req.ctx),
        );
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post("/tracings/:tracingId/replace", async (req, res) => {
    try {
      const tracing = await operationsService.replaceTracing(
        req.params,
        logger(req.ctx),
      );
      return res.status(200).json(tracing).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.post(
    "/tracings/:tracingId/versions/:version/state",
    async (req, res) => {
      try {
        await operationsService.updateTracingState(
          req.params,
          req.body,
          logger(req.ctx),
        );
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post(
    "/tracings/:tracingId/versions/:version/errors",
    async (req, res) => {
      try {
        await operationsService.savePurposeError(
          req.params,
          req.body,
          logger(req.ctx),
        );
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post("/tenants", async (req, res) => {
    try {
      const eservice = await operationsService.saveTenant(
        req.body,
        logger(req.ctx),
      );

      return res.status(204).json(eservice).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.delete("/tenants/:tenantId", async (req, res) => {
    try {
      await operationsService.deleteTenant(req.params, logger(req.ctx));
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.post(
    "/tenants/:tenantId/tracings/missing",
    async (req, res) => {
      try {
        await operationsService.saveMissingTracing(
          req.params,
          req.body,
          logger(req.ctx),
        );
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post(
    "/tenants/:tenantId/tracings/missing",
    async (req, res) => {
      try {
        await operationsService.saveMissingTracing(
          req.params,
          req.body,
          logger(req.ctx),
        );
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.get("/tenants/tracings/missing", async (req, res) => {
    try {
      const tenants = await operationsService.getTenantsWithMissingTracings(
        req.query,
        logger(req.ctx),
      );
      return res
        .status(200)
        .json({ results: tenants.results, totalCount: tenants.totalCount })
        .end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.delete("/tracings/errors", async (req, res) => {
    try {
      await operationsService.deletePurposesErrors(logger(req.ctx));
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.get(
    "/tracings",
    tenantAuthorizerMiddleware(),
    async (req, res) => {
      try {
        const tracings = await operationsService.getTracings(
          {
            ...req.query,
            tenantId: req.ctx.authData.tenantId,
          },
          logger(req.ctx),
        );
        return res
          .status(200)
          .json({ results: tracings.results, totalCount: tracings.totalCount })
          .end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.get(
    "/tracings/:tracingId/errors",
    tenantAuthorizerMiddleware(),
    async (req, res) => {
      try {
        const tracingErrors = await operationsService.getTracingErrors(
          req.query,
          req.params,
          logger(req.ctx),
        );

        return res
          .status(200)
          .json({
            results: tracingErrors.results,
            totalCount: tracingErrors.totalCount,
          })
          .end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post("/purposes", async (req, res) => {
    try {
      await operationsService.savePurpose(req.body, logger(req.ctx));
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.delete("/purposes/:purposeId", async (req, res) => {
    try {
      await operationsService.deletePurpose(req.params, logger(req.ctx));
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  return operationsRouter;
};

export default operationsRouter;
