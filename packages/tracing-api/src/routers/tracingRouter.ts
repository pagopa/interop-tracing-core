import { ZodiosEndpointDefinitions, ZodiosInstance } from "@zodios/core";
import { ZodiosRouter } from "@zodios/express";
import {
  ExpressContext,
  ZodiosContext,
  logger,
} from "pagopa-interop-tracing-commons";
import { Api } from "pagopa-interop-tracing-operations-client";
import { genericError } from "pagopa-interop-tracing-models";
import { z } from "zod";
import { resolveOperationsApiClientProblem } from "../model/domain/errors.js";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../services/operationsService.js";
import { api } from "../model/generated/api.js";
import {
  ApiTracingErrorsContent,
  ApiTracingsContent,
} from "../model/tracing.js";
import validationErrorHandler from "../utilities/validationErrorHandler.js";

const tracingRouter =
  (
    ctx: ZodiosContext,
  ): ((
    operationsApiClient: ZodiosInstance<Api>,
  ) => ZodiosRouter<ZodiosEndpointDefinitions, ExpressContext>) =>
  (operationsApiClient: ZodiosInstance<Api>) => {
    const operationsService: OperationsService =
      operationsServiceBuilder(operationsApiClient);
    const router = ctx.router(api.api, {
      validationErrorHandler,
    });

    router
      .post("/tracings/submit", async (req, res) => {
        try {
          const result = await operationsService.submitTracing({
            date: req.body.date,
          });

          return res.status(200).json(result).end();
        } catch (error) {
          const errorRes = resolveOperationsApiClientProblem(error);
          return res.status(errorRes.status).json(errorRes).end();
        }
      })
      .get("/tracings", async (req, res) => {
        try {
          const data = await operationsService.getTracings(req.query);

          const result = z.array(ApiTracingsContent).safeParse(data.results);
          if (!result.success) {
            logger.error(
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
          const errorRes = resolveOperationsApiClientProblem(error);
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
            logger.error(
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
          const errorRes = resolveOperationsApiClientProblem(error);
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
          const errorRes = resolveOperationsApiClientProblem(error);
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
          const errorRes = resolveOperationsApiClientProblem(error);
          return res.status(errorRes.status).json(errorRes).end();
        }
      });

    return router;
  };

export default tracingRouter;
