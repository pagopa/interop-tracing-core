import { config } from "../utilities/config.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { parseCSV } from "../models/models.js";
import { TracingRecords } from "../models/messages.js";

export const bucketServiceBuilder = (s3Client: S3Client) => {
  return {
    async writeObject(file: unknown): Promise<unknown> {
      return Promise.resolve(file);
    },
    async readObject(s3KeyFile: string): Promise<TracingRecords> {
      const params = {
        Bucket: config.bucketS3Name,
        Key: s3KeyFile,
      };
      try {
        const s3Object = await s3Client.send(new GetObjectCommand(params));
        if (!s3Object.Body) {
          throw new Error("No data found in S3 object");
        }
        const csvData = await parseCSV(s3Object.Body as Readable);
        return csvData;
      } catch (e) {
        console.error("Error fetching object from S3:", e);
      }
      return Promise.resolve([]);
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
