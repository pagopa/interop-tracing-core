import { ZodiosEndpointDefinitions } from "@zodios/core";
import { ZodiosRouter } from "@zodios/express";
import {
  ExpressContext,
  ISODateFormat,
  ZodiosContext,
  logger,
  zodiosValidationErrorToApiProblem,
} from "pagopa-interop-tracing-commons";
import { genericError, tracingState } from "pagopa-interop-tracing-models";
import {
  cancelTracingStateAndVersionError,
  resolveApiProblem,
  updateTracingStateError,
} from "../model/domain/errors.js";
import { OperationsService } from "../services/operationsService.js";
import { api } from "../model/generated/api.js";
import {
  ApiTracingErrorsContent,
  ApiTracingsContent,
} from "../model/tracing.js";
import { BucketService } from "../services/bucketService.js";
import storage from "../utilities/multer.js";
import { correlationIdToHeader, purposeIdToHeader } from "../model/headers.js";

const tracingRouter =
  (
    ctx: ZodiosContext,
  ): ((
    operationsService: OperationsService,
    bucketService: BucketService,
  ) => ZodiosRouter<ZodiosEndpointDefinitions, ExpressContext>) =>
  (operationsService: OperationsService, bucketService: BucketService) => {
    const router = ctx.router(api.api, {
      validationErrorHandler: zodiosValidationErrorToApiProblem,
    });

    router
      .post("/tracings/submit", async (req, res) => {
        try {
          const result = await operationsService.submitTracing(
            {
              ...purposeIdToHeader(req.ctx.requesterAuthData.purposeId),
              ...correlationIdToHeader(req.ctx.correlationId),
            },
            {
              date: req.body.date,
            },
          );

          const bucketS3Key = buildS3Key(
            result.tenantId,
            result.date,
            result.tracingId,
            result.version,
            req.ctx.correlationId,
          );

          await bucketService
            .writeObject(req.body.file, bucketS3Key)
            .catch(async (error) => {
              await operationsService
                .updateTracingState(
                  {
                    ...correlationIdToHeader(req.ctx.correlationId),
                  },
                  {
                    version: result.version,
                    tracingId: result.tracingId,
                  },
                  { state: tracingState.missing },
                )
                .catch((e) => {
                  throw updateTracingStateError(
                    `Unable to update tracing state with tracingId: ${result.tracingId}. Details: ${e}`,
                  );
                });

              throw error;
            });

          return res
            .status(200)
            .json({
              tracingId: result.tracingId,
              errors: result.errors,
            })
            .end();
        } catch (error) {
          const errorRes = resolveApiProblem(error, logger(req.ctx));
          return res.status(errorRes.status).json(errorRes).end();
        } finally {
          if (req.body?.file) {
            await storage.unlink(req.body.file.path);
          }
        }
      })
      .get("/tracings", async (req, res) => {
        try {
          const data = await operationsService.getTracings(req.query);
          const result = ApiTracingsContent.safeParse(data);
          if (!result.success) {
            logger(req.ctx).error(
              `Unable to parse tracings items: result ${JSON.stringify(
                result,
              )} - data ${JSON.stringify(data.results)} `,
            );

            throw genericError("Unable to parse tracings items");
          }

          return res
            .status(200)
            .json({
              results: result.data.results,
              totalCount: result.data.totalCount,
            })
            .end();
        } catch (error) {
          const errorRes = resolveApiProblem(error, logger(req.ctx));
          return res.status(errorRes.status).json(errorRes).end();
        }
      })
      .get("/tracings/:tracingId/errors", async (req, res) => {
        try {
          const data = await operationsService.getTracingErrors(
            req.params,
            req.query,
          );

          const result = ApiTracingErrorsContent.safeParse(data);
          if (!result.success) {
            logger(req.ctx).error(
              `Unable to parse tracing errors content items: result ${JSON.stringify(
                result,
              )} - data ${JSON.stringify(data.results)} `,
            );

            throw genericError("Unable to parse tracing errors content items");
          }

          return res
            .status(200)
            .json({
              results: result.data.results,
              totalCount: result.data.totalCount,
            })
            .end();
        } catch (error) {
          const errorRes = resolveApiProblem(error, logger(req.ctx));
          return res.status(errorRes.status).json(errorRes).end();
        }
      })
      .put("/tracings/:tracingId/recover", async (req, res) => {
        try {
          const result = await operationsService.recoverTracing(req.params);

          const bucketS3Key = buildS3Key(
            result.tenantId,
            result.date,
            result.tracingId,
            result.version,
            req.ctx.correlationId,
          );

          await bucketService
            .writeObject(req.body.file, bucketS3Key)
            .catch(async (error) => {
              await operationsService
                .cancelTracingStateAndVersion(
                  {
                    tracingId: result.tracingId,
                  },
                  { state: result.previousState, version: result.version - 1 },
                )
                .catch((e) => {
                  throw cancelTracingStateAndVersionError(
                    `Unable to cancel tracing to previous version with tracingId: ${result.tracingId}. Details: ${e}`,
                  );
                });

              throw error;
            });

          return res
            .status(200)
            .json({
              tracingId: result.tracingId,
            })
            .end();
        } catch (error) {
          const errorRes = resolveApiProblem(error, logger(req.ctx));
          return res.status(errorRes.status).json(errorRes).end();
        }
      })
      .put("/tracings/:tracingId/replace", async (req, res) => {
        try {
          const result = await operationsService.replaceTracing(req.params);

          const bucketS3Key = buildS3Key(
            result.tenantId,
            result.date,
            result.tracingId,
            result.version,
            req.ctx.correlationId,
          );

          await bucketService
            .writeObject(req.body.file, bucketS3Key, true)
            .catch(async (error) => {
              await operationsService
                .cancelTracingStateAndVersion(
                  {
                    tracingId: result.tracingId,
                  },
                  { state: result.previousState, version: result.version - 1 },
                )
                .catch((e) => {
                  throw cancelTracingStateAndVersionError(
                    `Unable to cancel tracing to previous version with tracingId: ${result.tracingId}. Details: ${e}`,
                  );
                });

              throw error;
            });

          return res
            .status(200)
            .json({
              tracingId: result.tracingId,
            })
            .end();
        } catch (error) {
          const errorRes = resolveApiProblem(error, logger(req.ctx));
          return res.status(errorRes.status).json(errorRes).end();
        }
      });

    return router;
  };

const buildS3Key = (
  tenantId: string,
  date: string,
  tracingId: string,
  version: number,
  correlationId: string,
): string =>
  `tenantId=${tenantId}/date=${ISODateFormat.parse(
    date,
  )}/tracingId=${tracingId}/version=${version}/correlationId=${correlationId}/${tracingId}.csv`;

export default tracingRouter;
