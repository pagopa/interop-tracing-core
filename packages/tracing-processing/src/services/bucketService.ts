import { config } from "../utilities/config.js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { generateCSV, parseCSV } from "../models/models.js";
import { EnrichedPurpose, TracingRecords } from "../models/messages.js";
import { genericLogger } from "pagopa-interop-tracing-commons";
import {
  readObjectBucketS3Error,
  writeObjectBucketS3Error,
} from "../models/errors.js";

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
        genericLogger.info(
          `File uploaded successfully: ${JSON.stringify(result)}`,
        );
      } catch (error: unknown) {
        throw writeObjectBucketS3Error(
          `Error writing object with path: ${s3KeyPath}, Details: ${error}`,
        );
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
          throw "No data found in S3 object";
        }

        const csvData = await parseCSV(s3Object.Body as Readable);

        const csvDataWithRow = csvData.map((csv, index) => {
          return { ...csv, ...{ rowNumber: index } };
        });

        return csvDataWithRow;
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
