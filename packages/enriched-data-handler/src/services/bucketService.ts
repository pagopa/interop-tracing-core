import { Readable } from "stream";
import { TracingEnriched } from "../models/messages.js";
import { config } from "../utilities/config.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { parseCSV } from "../utilities/csvHandler.js";
import { readObjectBucketS3Error } from "../models/errors.js";

export const bucketServiceBuilder = (s3Client: S3Client) => {
  return {
    async readObject(s3KeyFile: string): Promise<TracingEnriched[]> {
      try {
        const params = {
          Bucket: config.bucketS3Name,
          Key: s3KeyFile,
        };

        const s3Object = await s3Client.send(new GetObjectCommand(params));
        if (!s3Object.Body) {
          throw new Error("No data found in S3 object");
        }

        return await parseCSV(s3Object.Body as Readable);
      } catch (error: unknown) {
        throw readObjectBucketS3Error(
          `Error fetching object from bucket with path: ${s3KeyFile}. Details: ${JSON.stringify(
            error,
          )}`,
        );
      }
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
