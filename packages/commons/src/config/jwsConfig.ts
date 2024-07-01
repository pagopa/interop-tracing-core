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
  })
  .transform((c) => ({
    wellKnownUrls: c.WELL_KNOWN_URLS,
    acceptedAudiences: c.ACCEPTED_AUDIENCES,
  }));
export type JWTConfig = z.infer<typeof JWTConfig>;
