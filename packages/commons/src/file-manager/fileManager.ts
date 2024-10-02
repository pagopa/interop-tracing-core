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
import {
  fileManagerBucketS3NameReadError,
  fileManagerBucketS3NameWriteError,
  fileManagerMissingTenantIdError,
  fileManagerWriteError,
  fileManagerReadError,
  fileManagerMissingBodyError,
} from "./fileManagerErrors.js";

type RecordType = {
  status: number;
  date: string;
  rowNumber: number;
  tracingId: string;
  producerOrigin: string;
  producerExternalId: string;
  producerName: string;
  consumerId: string;
  consumerExternalId: string;
  producerId: string;
};

export const fileManagerBuilder = (
  s3Client: S3Client,
  bucketS3Name?: string,
) => {
  return {
    async writeObject(
      input: RecordType[] | Buffer | ExpressMulterFile,
      bucketS3Key: string,
      tenantId?: string,
    ): Promise<void> {
      try {
        if (!bucketS3Name) {
          throw fileManagerBucketS3NameWriteError(
            "Bucket S3 name is required for write operation.",
          );
        }

        let body: Buffer;
        let contentType: string;

        if (Array.isArray(input)) {
          if (tenantId && tenantId !== "") {
            const csvData = generateCSV(
              input,
              Object.keys(input[0]) as (keyof RecordType)[],
              { tenantId },
            );
            body = Buffer.from(csvData);
            contentType = "text/csv";
          } else {
            throw fileManagerMissingTenantIdError(
              "Tenant ID is required when writing CSV data.",
            );
          }
        } else if (Buffer.isBuffer(input)) {
          body = input;
          contentType = "application/octet-stream";
        } else {
          const filePath = path.resolve(input.path);
          body = await fs.promises.readFile(filePath);
          contentType = input.mimetype;
        }

        const putObjectParams = {
          Bucket: bucketS3Name,
          Key: bucketS3Key,
          Body: body,
          ContentType: contentType,
        };

        await s3Client.send(new PutObjectCommand(putObjectParams));
      } catch (error: unknown) {
        throw fileManagerWriteError(`Error writing object to S3: ${error}`);
      }
    },

    async readObject<T = string[]>(
      s3KeyFile: string,
      transformFn?: (data: string[]) => T,
    ): Promise<T> {
      try {
        if (!bucketS3Name) {
          throw fileManagerBucketS3NameReadError(
            "Bucket S3 name is required for read operation.",
          );
        }

        const params = {
          Bucket: bucketS3Name,
          Key: s3KeyFile,
        };

        const s3Object = await s3Client.send(new GetObjectCommand(params));
        if (!s3Object.Body) {
          throw fileManagerMissingBodyError("No body found in S3 object");
        }

        const csvData = await parseCSV<string>(s3Object.Body as Readable);
        return transformFn ? transformFn(csvData) : (csvData as T);
      } catch (error: unknown) {
        throw fileManagerReadError(`Failed to read object: ${error}`);
      }
    },
  };
};

export type FileManager = ReturnType<typeof fileManagerBuilder>;
