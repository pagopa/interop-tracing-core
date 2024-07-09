import { z } from "zod";

export const ISODateFormat = z
  .string()
  .transform((value) => value.split("T")[0]);
export type ISODateFormat = z.infer<typeof ISODateFormat>;
