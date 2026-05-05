import { z } from "zod";
import { APIEndpoint } from "../index.js";

export const JWTConfig = z
  .object({
    WELL_KNOWN_URLS: z
      .string()
      .transform((s) => s.split(","))
      .pipe(z.array(APIEndpoint)),

    ACCEPTED_AUDIENCES: z
      .string()
      .transform((s) => s.split(","))
      .pipe(z.array(z.string())),
    JWKS_CACHE_MAX_AGE: z.coerce.number().optional(),
  })
  .transform((c) => ({
    wellKnownUrls: c.WELL_KNOWN_URLS,
    acceptedAudiences: c.ACCEPTED_AUDIENCES,
    jwksCacheMaxAge: c.JWKS_CACHE_MAX_AGE,
  }));

export type JWTConfig = z.infer<typeof JWTConfig>;
