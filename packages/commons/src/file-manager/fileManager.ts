import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { generateCSV, parseCSV } from "../utilities/csvHandler.js";
import path from "path";
import fs from "fs";
import { ExpressMulterFile } from "../model/multer.js";

export type FileManager = {
  writeObject: (
    input: string[] | Buffer | ExpressMulterFile,
    bucketS3Key: string,
    headers?: (keyof string)[],
  ) => Promise<void>;
  readObject: (s3KeyFile: string) => Promise<string[]>;
};

export const fileManagerBuilder = (
  s3Client: S3Client,
  bucketS3Name: string,
): FileManager => {
  return {
    async writeObject(
      input: string[] | Buffer | ExpressMulterFile,
      bucketS3Key: string,
      headers?: (keyof string)[],
    ): Promise<void> {
      try {
        let body: Buffer;
        let contentType: string;

        if (Array.isArray(input)) {
          if (!headers) {
            throw new Error(
              "Headers must be provided when input is an array of strings.",
            );
          }
          const csvData = generateCSV(input, headers);
          body = Buffer.from(csvData);
          contentType = "text/csv";
        } else if (input instanceof Buffer) {
          body = input;
          contentType = "application/octet-stream";
        } else if (input.path && input.mimetype) {
          if (input.buffer) {
            body = input.buffer;
          } else {
            const filePath = path.resolve(input.path);
            body = await fs.promises.readFile(filePath);
          }
          contentType = input.mimetype;
        } else {
          throw new Error("Invalid input type provided.");
        }

        const putObjectParams = {
          Bucket: bucketS3Name,
          Key: bucketS3Key,
          Body: body,
          ContentType: contentType,
        };
        await s3Client.send(new PutObjectCommand(putObjectParams));
      } catch (error: unknown) {
        throw new Error(`Error writing object to S3: ${error}`);
      }
    },

    async readObject(s3KeyFile: string): Promise<string[]> {
      const params = {
        Bucket: bucketS3Name,
        Key: s3KeyFile,
      };

      try {
        const s3Object = await s3Client.send(new GetObjectCommand(params));
        if (!s3Object.Body) {
          throw new Error("No body found in S3 object");
        }

        const csvData = await parseCSV<string>(s3Object.Body as Readable);
        return csvData;
      } catch (error) {
        throw new Error(`Failed to read object: ${error}`);
      }
    },
  };
};
