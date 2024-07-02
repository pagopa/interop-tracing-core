import { Request } from "express";
import { P, match } from "ts-pattern";

export const readCorrelationIdHeader = (req: Request): string | undefined =>
  match(req.headers)
    .with(
      { "X-Correlation-Id": P.string },
      (headers) => headers["X-Correlation-Id"],
    )
    .otherwise(() => undefined);
