import {
  ZodiosRouterContextRequestHandler,
  zodiosContext,
} from "@zodios/express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { RequesterAuthData, TenantAuthData } from "../auth/authData.js";
import { Logger } from "../logging/index.js";
import { readCorrelationIdHeader } from "../auth/headers.js";

export const AppContext = z.object({
  serviceName: z.string(),
  correlationId: z.string(),
  requesterAuthData: RequesterAuthData,
  tenantAuthData: TenantAuthData,
});
export type AppContext = z.infer<typeof AppContext>;

export const zodiosCtx = zodiosContext(z.object({ ctx: AppContext }));
export type ZodiosContext = NonNullable<typeof zodiosCtx>;
export type ExpressContext = NonNullable<typeof zodiosCtx.context>;

export type WithLogger<T> = T & { logger: Logger };
export type WithSQSMessageId<T> = T & { messageId: string };

export const contextMiddleware =
  (serviceName: string): ZodiosRouterContextRequestHandler<ExpressContext> =>
  (req, _res, next): void => {
    req.ctx = {
      serviceName,
      correlationId: readCorrelationIdHeader(req) ?? uuidv4(),
    } as AppContext;

    next();
  };
