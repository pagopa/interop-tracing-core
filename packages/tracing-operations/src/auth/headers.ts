import { Request } from "express";
import {
  RequesterPurposeIdHeader,
  PurposeId,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { z } from "zod";

export const ParsedHeaders = z.object({
  purposeId: PurposeId,
});
export type ParsedHeaders = z.infer<typeof ParsedHeaders>;

export const getRequesterAuthData = (
  req: Request,
): ParsedHeaders | undefined => {
  try {
    const headers = RequesterPurposeIdHeader.parse(req.headers);

    return match(headers)
      .with(
        {
          "X-Requester-Purpose-Id": P.string,
        },
        (headers) => {
          return {
            purposeId: headers["X-Requester-Purpose-Id"] as PurposeId,
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
