import { Request } from "express";
import { PurposeId } from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { z } from "zod";

export const Headers = z.object({
  "x-correlation-id": z.string().nullish(),
  "x-purpose-id": z.string().nullish(),
});
export type Headers = z.infer<typeof Headers>;

export const ParsedHeaders = z.object({
  correlationId: z.string(),
  purposeId: PurposeId,
});
export type ParsedHeaders = z.infer<typeof ParsedHeaders>;

export const readHeaders = (req: Request): ParsedHeaders | undefined => {
  try {
    const headers = Headers.parse(req.headers);

    return match(headers)
      .with(
        {
          "x-purpose-id": P.string,
          "x-correlation-id": P.string,
        },
        (headers) => {
          return {
            purposeId: headers["x-purpose-id"] as PurposeId,
            correlationId: headers["x-correlation-id"],
          };
        },
      )
      .otherwise(() => {
        return undefined;
      });
  } catch (error) {
    return undefined;
  }
};
