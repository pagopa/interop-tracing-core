import { z } from "zod";

export const RequesterAuthData = z.object({
  purposeId: z.string().uuid(),
});
export type RequesterAuthData = z.infer<typeof RequesterAuthData>;

export const TenantAuthData = z.object({
  tenantId: z.string().uuid(),
});
export type TenantAuthData = z.infer<typeof TenantAuthData>;

export type AuthData = Partial<RequesterAuthData & TenantAuthData>;
