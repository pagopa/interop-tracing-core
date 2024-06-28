import z from "zod";

export const ExpressMulterFile = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number(),
  stream: z.any(),
  destination: z.string(),
  filename: z.string(),
  path: z.string(),
  buffer: z.instanceof(Buffer).optional(),
});

export type ExpressMulterFile = z.infer<typeof ExpressMulterFile>;
