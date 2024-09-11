import { z } from "zod";

export const AuthToken = z.object({
  purposeId: z.string().uuid(),
});
export type AuthToken = z.infer<typeof AuthToken>;
