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
import { purposeAuthorizerMiddlewareBuilder } from "../auth/purposeAuthorizerMiddlewareBuilder.js";
import { errorMapper } from "../utilities/errorMapper.js";
import { bucketServiceBuilder } from "../services/bucketService.js";
import { S3Client } from "@aws-sdk/client-s3";

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

  const s3client: S3Client = new S3Client({
    region: config.awsRegion,
  });
  const bucketService = bucketServiceBuilder(s3client);

  const operationsRouter = ctx.router(api.api);
  const dbService = dbServiceBuilder(dbInstance);
  const operationsService = operationsServiceBuilder(dbService, bucketService);
  const { purposeAuthorizerMiddleware } =
    purposeAuthorizerMiddlewareBuilder(dbService);

  operationsRouter.post(
    "/tracings/submit",
    purposeAuthorizerMiddleware(),
    async (req, res) => {
      try {
        const tracing = await operationsService.submitTracing(
          {
            ...req.body,
            tenantId: req.ctx.tenantAuthData.tenantId,
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

  operationsRouter.post("/tracings/:tracingId/recover", async (req, res) => {
    try {
      await operationsService.recoverTracing();
      return res.status(200).json().end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.post("/tracings/:tracingId/replace", async (req, res) => {
    try {
      await operationsService.replaceTracing();
      return res.status(200).json().end();
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

  operationsRouter.post(
    "/tracings/:tracingId/triggerCopy",
    async (req, res) => {
      const correlationID = {
        "X-Correlation-Id": req.header("x-correlation-id") ?? "",
      };
      try {
        await operationsService.triggerS3Copy(
          req.params,
          correlationID,
          logger(req.ctx),
        );
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.post("/tenants/:tenantId/missing", async (req, res) => {
    try {
      await operationsService.saveMissingTracing();
      return res.status(204).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  operationsRouter.delete(
    "/tracings/:tracingId/versions/:version/errors",
    async (req, res) => {
      try {
        await operationsService.deletePurposeErrors();
        return res.status(204).end();
      } catch (error) {
        const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
        return res.status(errorRes.status).json(errorRes).end();
      }
    },
  );

  operationsRouter.get("/tracings", async (req, res) => {
    try {
      const tracings = await operationsService.getTracings(
        req.query,
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
  });

  operationsRouter.get("/tracings/:tracingId/errors", async (req, res) => {
    try {
      await operationsService.getTracingErrors();
      return res.status(204).json({ errors: [], totalCount: 0 }).end();
    } catch (error) {
      const errorRes = makeApiProblem(error, errorMapper, logger(req.ctx));
      return res.status(errorRes.status).json(errorRes).end();
    }
  });

  return operationsRouter;
};

export default operationsRouter;
