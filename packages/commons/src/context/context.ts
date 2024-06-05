import { AsyncLocalStorage } from "async_hooks";
import { NextFunction, Response } from "express";
import {
  ZodiosRouterContextRequestHandler,
  zodiosContext,
} from "@zodios/express";
import { z } from "zod";

export type AppContext = z.infer<typeof ctx>;
export type ZodiosContext = NonNullable<typeof zodiosCtx>;
export type ExpressContext = NonNullable<typeof zodiosCtx.context>;

export const ctx = z.object({
  correlationId: z.string().uuid(),
  purpose_id: z.string().uuid(),
});

export const zodiosCtx = zodiosContext(z.object({ ctx }));

const globalStore = new AsyncLocalStorage<AppContext>();
const defaultAppContext: AppContext = {
  correlationId: "",
  purpose_id: "",
};

export const getContext = (): AppContext => {
  const context = globalStore.getStore();
  return !context ? defaultAppContext : context;
};

export const globalContextMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  globalStore.run(defaultAppContext, () => defaultAppContext);
  next();
};

export const contextMiddleware: ZodiosRouterContextRequestHandler<
  ExpressContext
> = (req, res, next) => {
  try {
    req.ctx = {
      purpose_id: "",
      correlationId: "",
    };
    return next();
  } catch (error) {
    return res
      .status(500)
      .json({ code: "serverError", message: "Internal Server Error" })
      .end();
  }
};
