import {
  ZodiosRouterContextRequestHandler,
  zodiosContext,
} from "@zodios/express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Logger } from "../logging/index.js";
import { readCorrelationIdHeader } from "./headers.js";

export const AppContext = z.object({
  serviceName: z.string(),
  correlationId: z.string(),
});

export type AppContext = z.infer<typeof AppContext>;
export type ServiceContext<T> = AppContext & T;

export const zodiosCtx = zodiosContext(z.object({ ctx: AppContext }));
export type ZodiosContext = NonNullable<typeof zodiosCtx>;
export type ExpressContext = NonNullable<typeof zodiosCtx.context>;

export type WithLogger<T> = T & { logger: Logger };
export type WithSQSMessageId<T> = T & { messageId?: string };

export const contextMiddleware =
  (
    serviceName: string,
    overrideCorrelationId: boolean = false,
  ): ZodiosRouterContextRequestHandler<ExpressContext> =>
  (req, _res, next): void => {
    req.ctx = {
      serviceName,
      correlationId: overrideCorrelationId
        ? uuidv4()
        : readCorrelationIdHeader(req) ?? uuidv4(),
    } as AppContext;

    next();
  };
