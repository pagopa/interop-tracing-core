import { ZodiosEndpointDefinitions } from "@zodios/core";
import { ZodiosRouter } from "@zodios/express";
import {
  ExpressContext,
  ZodiosContext,
  genericLogger,
  zodiosValidationErrorToApiProblem,
} from "pagopa-interop-tracing-commons";
import {
  OperationsHeaders,
  genericError,
  tracingState,
} from "pagopa-interop-tracing-models";
import { z } from "zod";
import {
  resolveApiClientProblem,
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
              ...operationsHeaders(
                req.ctx.correlationId,
                req.ctx.authData.purposeId,
              ),
            },
            {
              date: req.body.date,
            },
          );

          const bucketS3Key = `${result.tenantId}/${result.date}/${result.tracingId}/${result.version}/${result.tracingId}`;

          await bucketService
            .writeObject(req.body.file, bucketS3Key)
            .catch(async (error) => {
              genericLogger.error(
                `Unable to write tracing with pathName: ${bucketS3Key}. Details: ${error}`,
              );

              await operationsService
                .updateTracingState(
                  {
                    ...operationsHeaders(
                      req.ctx.correlationId,
                      req.ctx.authData.purposeId,
                    ),
                  },
                  {
                    version: result.version,
                    tracingId: result.tracingId,
                  },
                  { state: tracingState.missing },
                )
                .catch((e) => {
                  throw updateTracingStateError(`${e}`);
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
          const errorRes = resolveApiClientProblem(error);
          return res.status(errorRes.status).json(errorRes).end();
        } finally {
          if (req.file) {
            await storage.unlink(req.file.path);
          }
        }
      })
      .get("/tracings", async (req, res) => {
        try {
          const data = await operationsService.getTracings(req.query);

          const result = z.array(ApiTracingsContent).safeParse(data.results);
          if (!result.success) {
            genericLogger.error(
              `Unable to parse tracings items: result ${JSON.stringify(
                result,
              )} - data ${JSON.stringify(data.results)} `,
            );

            throw genericError("Unable to parse tracings items");
          }

          return res
            .status(200)
            .json({
              results: result.data,
              totalCount: data.totalCount,
            })
            .end();
        } catch (error) {
          const errorRes = resolveApiClientProblem(error);
          return res.status(errorRes.status).json(errorRes).end();
        }
      })
      .get("/tracings/:tracingId/errors", async (req, res) => {
        try {
          const data = await operationsService.getTracingErrors(
            req.params.tracingId,
            req.query,
          );

          const result = z
            .array(ApiTracingErrorsContent)
            .safeParse(data.errors);

          if (!result.success) {
            genericLogger.error(
              `Unable to parse tracing errors items: result ${JSON.stringify(
                result,
              )} - data ${JSON.stringify(data.errors)} `,
            );

            throw genericError("Unable to parse tracing errors items");
          }

          return res
            .status(200)
            .json({
              errors: result.data,
              totalCount: data.totalCount,
            })
            .end();
        } catch (error) {
          const errorRes = resolveApiClientProblem(error);
          return res.status(errorRes.status).json(errorRes).end();
        }
      })
      .put("/tracings/:tracingId/recover", async (req, res) => {
        try {
          const result = await operationsService.recoverTracing(
            req.params.tracingId,
          );

          return res.status(200).json(result).end();
        } catch (error) {
          const errorRes = resolveApiClientProblem(error);
          return res.status(errorRes.status).json(errorRes).end();
        }
      })
      .put("/tracings/:tracingId/replace", async (req, res) => {
        try {
          const result = await operationsService.replaceTracing(
            req.params.tracingId,
          );

          return res.status(200).json(result).end();
        } catch (error) {
          const errorRes = resolveApiClientProblem(error);
          return res.status(errorRes.status).json(errorRes).end();
        }
      });

    return router;
  };

export default tracingRouter;

const operationsHeaders = (
  correlationId: string,
  purposeId: string,
): OperationsHeaders => ({
  "X-Correlation-Id": correlationId,
  "X-Requester-Purpose-Id": purposeId,
});
