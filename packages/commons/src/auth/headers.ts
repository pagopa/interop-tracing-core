import { Request } from "express";
import { P, match } from "ts-pattern";
import { z } from "zod";

export const Headers = z.object({
  authorization: z.string().nullish(),
  "x-correlation-id": z.string().nullish(),
});

export type Headers = z.infer<typeof Headers>;

export const readCorrelationIdHeader = (req: Request): string | undefined =>
  match(req.headers)
    .with(
      { "x-correlation-id": P.string },
      (headers) => headers["x-correlation-id"],
    )
    .otherwise(() => undefined);
