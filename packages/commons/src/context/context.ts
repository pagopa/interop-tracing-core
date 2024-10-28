import {
  ZodiosRouterContextRequestHandler,
  zodiosContext,
} from "@zodios/express";
import { z } from "zod";
import { logger, Logger } from "../logging/index.js";
import { readCorrelationIdHeader } from "./headers.js";
import {
  CorrelationId,
  generateId,
  unsafeBrandId,
} from "pagopa-interop-tracing-models";
import { v4 as uuidv4 } from "uuid";

export const AppContext = z.object({
  serviceName: z.string(),
  correlationId: CorrelationId,
});

export type AppContext = z.infer<typeof AppContext>;
export type ServiceContext<T> = AppContext & T;

export const zodiosCtx = zodiosContext(z.object({ ctx: AppContext }));
export type ZodiosContext = NonNullable<typeof zodiosCtx>;
export type ExpressContext = NonNullable<typeof zodiosCtx.context>;

export type WithLogger<T> = T & { logger: Logger };
export type WithSQSMessageId<T> = T & { messageId?: string | null | undefined };

export function fromAppContext(ctx: AppContext): WithLogger<AppContext> {
  return { ...ctx, logger: logger({ ...ctx }) };
}

export const contextMiddleware =
  (
    serviceName: string,
    overrideCorrelationId: boolean = false,
  ): ZodiosRouterContextRequestHandler<ExpressContext> =>
  (req, _res, next): void => {
    req.ctx = {
      serviceName,
      correlationId: overrideCorrelationId
        ? generateId<CorrelationId>()
        : unsafeBrandId<CorrelationId>(
            readCorrelationIdHeader(req) || uuidv4(),
          ),
    } as AppContext;

    next();
  };
