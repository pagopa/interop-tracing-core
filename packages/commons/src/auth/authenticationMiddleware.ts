/* eslint-disable @typescript-eslint/naming-convention */
import { ZodiosRouterContextRequestHandler } from "@zodios/express";
import {
  makeApiProblemBuilder,
  missingBearer,
  missingHeader,
  unauthorizedError,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { ExpressContext } from "../index.js";
import { logger } from "../logging/index.js";
import { AuthData } from "./authData.js";
import { readAuthDataFromJwtToken, verifyJwtToken } from "./jwt.js";
import { Logger } from "winston";
import { z } from "zod";

const makeApiProblem = makeApiProblemBuilder({});

export const Headers = z.object({
  authorization: z.string().nullish(),
  "x-correlation-id": z.string().nullish(),
});

export type Headers = z.infer<typeof Headers>;

export const authenticationMiddleware: ZodiosRouterContextRequestHandler<
  ExpressContext
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
    const { purposeId }: AuthData = readAuthDataFromJwtToken(jwtToken);
    req.ctx.purposeId = purposeId;
    next();
  };

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
        async (headers) => await addCtxAuthData(headers.authorization, logger),
      )
      .with(
        {
          authorization: P.nullish,
        },
        () => {
          logger.warn(
            `No authentication has been provided for this call ${req.method} ${req.url}`,
          );

          throw missingBearer;
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
          .with("operationForbidden", () => 403)
          .with("missingHeader", () => 400)
          .otherwise(() => 500),
      logger,
    );
    return res.status(problem.status).json(problem).end();
  }
};
