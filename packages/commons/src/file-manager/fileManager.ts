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
import { generateCSV, parseCSV } from "../utilities/csvHandler.js";
// import {
//   readObjectBucketS3Error,
//   writeObjectBucketS3Error,
// } from "../models/errors.js";

export type FileManager = {
  writeObject: (
    input: string | Buffer,
    s3KeyPath: string,
    contentType: string,
    ctx: WithSQSMessageId<AppContext>,
  ) => Promise<void>;
  readObject: (s3KeyFile: string) => Promise<string[]>;
};

export const fileManagerBuilder = (
  s3Client: S3Client,
  bucketS3Name: string,
  bucketEnrichedS3Name: string,
  headers: (keyof string)[],
): FileManager => {
  return {
    async writeObject(
      input: string | Buffer,
      s3KeyPath: string,
      contentType: string,
      ctx: WithSQSMessageId<AppContext>,
    ) {
      try {
        let body: Buffer;

        if (Buffer.isBuffer(input)) {
          body = input;
        } else {
          const csvData = generateCSV(input, headers);
          body = Buffer.from(csvData);
        }

        const params = {
          Bucket: bucketEnrichedS3Name,
          Key: s3KeyPath,
          Body: body,
          ContentType: contentType,
        };

        await s3Client.send(new PutObjectCommand(params));
        logger(ctx).info(`File uploaded successfully with path: ${s3KeyPath}`);
      } catch (error: unknown) {
        // throw writeObjectBucketS3Error(
        //   `Error writing object with path: ${s3KeyPath}. Details: ${error}`,
        // );
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
      } catch (error: unknown) {
        // throw readObjectBucketS3Error(
        //   `Error fetching object from bucket with path: ${s3KeyFile}. Details: ${JSON.stringify(
        //     error,
        //   )}`,
        // );
        throw new Error();
      }
    },
  };
};
