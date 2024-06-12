import { Request } from "express";
import { OperationsHeaders, PurposeId } from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { z } from "zod";

export const ParsedHeaders = z.object({
  correlationId: z.string(),
  purposeId: PurposeId,
});
export type ParsedHeaders = z.infer<typeof ParsedHeaders>;

export const readHeaders = (req: Request): ParsedHeaders | undefined => {
  try {
    const headers = OperationsHeaders.parse(req.headers);

    return match(headers)
      .with(
        {
          "X-Requester-Purpose-Id": P.string,
          "X-Correlation-Id": P.string,
        },
        (headers) => {
          return {
            purposeId: headers["X-Requester-Purpose-Id"] as PurposeId,
            correlationId: headers["X-Correlation-Id"],
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
