import { Request } from "express";
import { P, match } from "ts-pattern";
import { z } from "zod";

export const Headers = z.object({
  authorization: z.string().nullish(),
  "X-Correlation-Id": z.string().nullish(),
});

export type Headers = z.infer<typeof Headers>;

export const readCorrelationIdHeader = (req: Request): string | undefined =>
  match(req.headers)
    .with(
      { "X-Correlation-Id": P.string },
      (headers) => headers["X-Correlation-Id"],
    )
    .otherwise(() => undefined);
