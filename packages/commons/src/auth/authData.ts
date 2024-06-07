import { z } from "zod";

export const AuthToken = z.object({
  purposeId: z.string().uuid(),
});
export type AuthToken = z.infer<typeof AuthToken>;

export const AuthData = z.object({
  purposeId: z.string().uuid(),
});
export type AuthData = z.infer<typeof AuthData>;
export const defaultAuthData: AuthData = {
  purposeId: "",
};

export const KeySchema = z.array(
  z.object({
    kid: z.string(),
  }),
);

export type PublicKey = z.infer<typeof KeySchema>;

export const getAuthDataFromToken = (token: AuthToken): AuthData => ({
  purposeId: token.purposeId ?? defaultAuthData.purposeId,
});
