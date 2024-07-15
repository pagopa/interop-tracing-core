/* eslint-disable @typescript-eslint/naming-convention */
import { ZodiosRouterContextRequestHandler } from "@zodios/express";
import {
  makeApiProblemBuilder,
  missingBearer,
  missingHeader,
  unauthorizedError,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { readAuthDataFromJwtToken, verifyJwtToken } from "./jwt.js";
import { z } from "zod";
import { Logger, logger } from "pagopa-interop-tracing-commons";
import { LocalExpressContext } from "../context/index.js";

const makeApiProblem = makeApiProblemBuilder({});

export const Headers = z.object({
  authorization: z.string().nullish(),
});

export type Headers = z.infer<typeof Headers>;

export const authenticationMiddleware: ZodiosRouterContextRequestHandler<
  LocalExpressContext
> = async (req, res, next): Promise<unknown> => {
  const addCtxAuthData = async (
    authHeader: string,
    logger: Logger,
  ): Promise<void> => {
    const authorizationHeader = authHeader.split(" ");
    if (
      authorizationHeader.length !== 2 ||
      authorizationHeader[0] !== "Bearer"
    ) {
      logger.warn(
        `No authentication has been provided for this call ${req.method} ${req.url}`,
      );
      throw missingBearer;
    }
    const jwtToken = authorizationHeader[1];
    const valid = await verifyJwtToken(jwtToken, logger);
    if (!valid) {
      throw unauthorizedError("Invalid token");
    }
    const authData = readAuthDataFromJwtToken(jwtToken);
    req.ctx.authData.purposeId = authData.purposeId;
    next();
  };

  const loggerInstance = logger({
    serviceName: req.ctx.serviceName,
    correlationId: req.ctx.correlationId,
  });

  try {
    const headers = Headers.safeParse(req.headers);
    if (!headers.success) {
      throw missingHeader();
    }
    return await match(headers.data)
      .with(
        {
          authorization: P.string,
        },
        async (headers) =>
          await addCtxAuthData(headers.authorization, loggerInstance),
      )
      .with(
        {
          authorization: P.nullish,
        },
        () => {
          loggerInstance.warn(
            `No authentication has been provided for this call ${req.method} ${req.url}`,
          );

          throw missingBearer;
        },
      )
      .with(
        {
          authorization: P.string,
        },
        () => {
          throw missingHeader("Authorization");
        },
      )
      .otherwise(() => {
        throw missingHeader();
      });
  } catch (error) {
    const problem = makeApiProblem(
      error,
      (err: { code: string }) =>
        match(err.code)
          .with("unauthorizedError", () => 401)
          .with("missingHeader", () => 400)
          .otherwise(() => 500),
      loggerInstance,
    );
    return res.status(problem.status).json(problem).end();
  }
};
