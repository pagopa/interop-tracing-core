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
          "x-requester-purpose-id": P.string,
        },
        (headers) => {
          return {
            purposeId: headers["x-requester-purpose-id"] as PurposeId,
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
