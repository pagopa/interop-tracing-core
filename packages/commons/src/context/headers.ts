import { Request } from "express";
import { P, match } from "ts-pattern";

export const readCorrelationIdHeader = (req: Request): string | undefined =>
  match(req.headers)
    .with(
      { "x-correlation-id": P.string },
      (headers) => headers["x-correlation-id"],
    )
    .otherwise(() => undefined);
