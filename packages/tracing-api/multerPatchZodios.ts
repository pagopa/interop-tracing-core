// Patch to resolve compatibility issue with Multer file uploads in Express applications.
// When using Zodios for generating API client code from Swagger definitions, the generated code
// utilizes z.instanceof(File) to validate file instances. The File constructor is specific to web APIs
// and is not compatible with Express.Multer.File instances used by Multer in Node.js environments.
// This patch replaces z.instanceof(File) with a detailed Zod schema that matches the structure
// of Express.Multer.File, ensuring proper validation and compatibility with Multer's file objects.

import { readFileSync, writeFileSync } from "fs";

const apiPath = new URL("./src/model/generated/api.ts", import.meta.url);
const apiContent = readFileSync(apiPath, "utf8");

const patch = [
  {
    find: `z.instanceof(File)`,
    replace: `z.object({
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
    })`,
  },
];

let newApiContent = apiContent;

for (const { find, replace } of patch) {
  newApiContent = newApiContent.replaceAll(find, replace);
}

writeFileSync(apiPath, newApiContent);
