import { config } from "../utilities/config.js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { generateCSV, parseCSV } from "../models/models.js";
import { EnrichedPurpose, TracingRecords } from "../models/messages.js";
import { logger } from "pagopa-interop-tracing-commons";

export const bucketServiceBuilder = (s3Client: S3Client) => {
  return {
    async writeObject(records: EnrichedPurpose[], s3KeyPath: string) {
      try {
        const csvData = generateCSV(records);
        const params = {
          Bucket: config.bucketEnrichedS3Name,
          Key: s3KeyPath,
          Body: csvData,
          ContentType: "text/csv",
        };
        const result = await s3Client.send(new PutObjectCommand(params));
        logger.info(`File uploaded successfully: ${JSON.stringify(result)}`);
      } catch (e) {
        logger.error("error on writing object", e);
      }
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
        const csvDataWithRow = csvData.map((csv, index) => {
          return { ...csv, ...{ rowNumber: index } };
        });
        return csvDataWithRow;
      } catch (e) {
        console.error("Error fetching object from S3:", e);
      }
      return Promise.resolve([]);
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
