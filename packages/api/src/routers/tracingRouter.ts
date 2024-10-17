import { ZodiosEndpointDefinitions } from "@zodios/core";
import { ZodiosRouter } from "@zodios/express";
import {
  logger,
  zodiosValidationErrorToApiProblem,
} from "pagopa-interop-tracing-commons";
import {
  correlationIdToHeader,
  genericError,
  organizationIdToHeader,
  tracingState,
} from "pagopa-interop-tracing-models";
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
import { FileManager } from "../../../commons/src/file-manager/fileManager.js";
import storage from "../routers/config/multer.js";
import { LocalExpressContext, LocalZodiosContext } from "../context/index.js";
import { readExpressMulterFile } from "../utilities/fileData.js";

const tracingRouter =
  (
    ctx: LocalZodiosContext,
  ): ((
    operationsService: OperationsService,
    fileManager: FileManager,
  ) => ZodiosRouter<ZodiosEndpointDefinitions, LocalExpressContext>) =>
  (operationsService: OperationsService, fileManager: FileManager) => {
    const router = ctx.router(api.api, {
      validationErrorHandler: zodiosValidationErrorToApiProblem,
    });

    router
      .post("/tracings/submit", async (req, res) => {
        try {
          const result = await operationsService.submitTracing(
            {
              ...organizationIdToHeader(req.ctx.authData.organizationId),
              ...correlationIdToHeader(req.ctx.correlationId),
            },
            {
              date: req.body.date,
            },
          );

          const bucketS3Key = fileManager.buildS3Key(
            result.tenantId,
            result.date,
            result.tracingId,
            result.version,
            req.ctx.correlationId,
          );

          await fileManager
            .writeObject(
              await readExpressMulterFile(req.body.file),
              bucketS3Key,
              req.body.file.mimetype,
            )
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
          const data = await operationsService.getTracings(
            {
              ...organizationIdToHeader(req.ctx.authData.organizationId),
              ...correlationIdToHeader(req.ctx.correlationId),
            },
            req.query,
          );
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
            {
              ...organizationIdToHeader(req.ctx.authData.organizationId),
              ...correlationIdToHeader(req.ctx.correlationId),
            },
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
      .post("/tracings/:tracingId/recover", async (req, res) => {
        try {
          const result = await operationsService.recoverTracing(
            {
              ...organizationIdToHeader(req.ctx.authData.organizationId),
              ...correlationIdToHeader(req.ctx.correlationId),
            },
            req.params,
          );

          const bucketS3Key = fileManager.buildS3Key(
            result.tenantId,
            result.date,
            result.tracingId,
            result.version,
            req.ctx.correlationId,
          );

          await fileManager
            .writeObject(
              await readExpressMulterFile(req.body.file),
              bucketS3Key,
              req.body.file.mimetype,
            )
            .catch(async (error) => {
              await operationsService
                .cancelTracingStateAndVersion(
                  {
                    ...organizationIdToHeader(req.ctx.authData.organizationId),
                    ...correlationIdToHeader(req.ctx.correlationId),
                  },
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
      .post("/tracings/:tracingId/replace", async (req, res) => {
        try {
          const result = await operationsService.replaceTracing(
            {
              ...organizationIdToHeader(req.ctx.authData.organizationId),
              ...correlationIdToHeader(req.ctx.correlationId),
            },
            req.params,
          );

          const bucketS3Key = fileManager.buildS3Key(
            result.tenantId,
            result.date,
            result.tracingId,
            result.version,
            req.ctx.correlationId,
          );

          await fileManager
            .writeObject(
              await readExpressMulterFile(req.body.file),
              bucketS3Key,
              req.body.file.mimetype,
            )
            .catch(async (error) => {
              await operationsService
                .cancelTracingStateAndVersion(
                  {
                    ...organizationIdToHeader(req.ctx.authData.organizationId),
                    ...correlationIdToHeader(req.ctx.correlationId),
                  },
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

export default tracingRouter;
