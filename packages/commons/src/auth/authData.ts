import { z } from "zod";

export const AuthToken = z.object({
  purposeId: z.string().uuid(),
});
export type AuthToken = z.infer<typeof AuthToken>;

export const RequesterAuthData = z.object({
  purposeId: z.string().uuid(),
});
export type RequesterAuthData = z.infer<typeof RequesterAuthData>;

export const TenantAuthData = z.object({
  tenantId: z.string().uuid(),
});
export type TenantAuthData = z.infer<typeof TenantAuthData>;

export const getAuthDataFromToken = (token: AuthToken): RequesterAuthData => {
  const parsedData = RequesterAuthData.parse({
    purposeId: token.purposeId,
  });
  return parsedData;
};
