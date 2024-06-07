import { z } from "zod";

export const AuthToken = z.object({
  purpose_id: z.string().uuid(),
});
export type AuthToken = z.infer<typeof AuthToken>;

export const AuthData = z.object({
  purpose_id: z.string().uuid(),
});
export type AuthData = z.infer<typeof AuthData>;
export const defaultAuthData: AuthData = {
  purpose_id: "",
};

export const KeySchema = z.array(
  z.object({
    kid: z.string(),
  }),
);

export type PublicKey = z.infer<typeof KeySchema>;

export const getAuthDataFromToken = (token: AuthToken): AuthData => ({
  purpose_id: token.purpose_id ?? defaultAuthData.purpose_id,
});
