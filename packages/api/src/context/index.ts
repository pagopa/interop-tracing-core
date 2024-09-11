import { zodiosContext } from "@zodios/express";
import { AppContext, RequesterAuthData } from "pagopa-interop-tracing-commons";
import { z } from "zod";

export const localZodiosCtx = zodiosContext(
  z.object({
    ctx: AppContext.extend({
      authData: RequesterAuthData,
    }),
  }),
);
export type LocalZodiosContext = NonNullable<typeof localZodiosCtx>;
export type LocalExpressContext = NonNullable<typeof localZodiosCtx.context>;
