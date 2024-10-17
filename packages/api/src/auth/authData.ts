import { z } from "zod";

export const AuthToken = z.object({
  organizationId: z.string().uuid(),
});
export type AuthToken = z.infer<typeof AuthToken>;
