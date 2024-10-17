import { Request } from "express";
import { OrganizationIdHeader, TenantId } from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { z } from "zod";

export const ParsedHeaders = z.object({
  tenantId: TenantId,
});
export type ParsedHeaders = z.infer<typeof ParsedHeaders>;

export const getRequesterAuthData = (
  req: Request,
): ParsedHeaders | undefined => {
  try {
    const headers = OrganizationIdHeader.parse(req.headers);

    return match(headers)
      .with(
        {
          "x-organization-id": P.string,
        },
        (headers) => {
          return {
            tenantId: headers["x-organization-id"] as TenantId,
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
