import { config } from "../utilities/config.js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import {
  AppContext,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import {
  readObjectBucketS3Error,
  writeObjectBucketS3Error,
} from "../models/errors.js";
import { generateCSV, parseCSV } from "../utilities/csvHandler.js";
import { TracingRecordSchema } from "../models/db.js";
import { EnrichedPurpose } from "../models/csv.js";

export const bucketServiceBuilder = (s3Client: S3Client) => {
  return {
    async writeObject(
      records: EnrichedPurpose[],
      s3KeyPath: string,
      tenantId: string,
      ctx: WithSQSMessageId<AppContext>,
    ) {
      try {
        const csvData = generateCSV(records, tenantId);
        const params = {
          Bucket: config.bucketEnrichedS3Name,
          Key: s3KeyPath,
          Body: csvData,
          ContentType: "text/csv",
        };
        await s3Client.send(new PutObjectCommand(params));
        logger(ctx).info(`File uploaded successfully with path: ${s3KeyPath}`);
      } catch (error: unknown) {
        throw writeObjectBucketS3Error(
          `Error writing object with path: ${s3KeyPath}. Details: ${error}`,
        );
      }
    },

    async readObject(s3KeyFile: string): Promise<TracingRecordSchema[]> {
      const params = {
        Bucket: config.bucketS3Name,
        Key: s3KeyFile,
      };
      try {
        const s3Object = await s3Client.send(new GetObjectCommand(params));
        if (!s3Object.Body) {
          throw new Error("No body found in S3 object");
        }

        const csvData = await parseCSV(s3Object.Body as Readable);
        const csvDataWithRow = csvData.map((csv, index) => {
          return { ...csv, rowNumber: index + 1 };
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
