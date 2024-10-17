import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  fileManagerBucketS3NameReadError,
  fileManagerBucketS3NameWriteError,
  fileManagerWriteError,
  fileManagerReadError,
  fileManagerMissingBodyError,
} from "./fileManagerErrors.js";
import { Readable } from "stream";

export const fileManagerBuilder = (
  s3Client: S3Client,
  bucketS3Name: string,
) => {
  return {
    async writeObject(
      input: Buffer,
      contentType: string,
      bucketS3Key: string,
      bucketEnrichedS3Name?: string,
    ): Promise<void> {
      try {
        if (!bucketS3Name) {
          throw fileManagerBucketS3NameWriteError(
            "Bucket S3 name is required for write operation.",
          );
        }
        const putObjectParams = {
          Bucket: bucketEnrichedS3Name ?? bucketS3Name,
          Key: bucketS3Key,
          Body: input,
          ContentType: contentType,
        };

        await s3Client.send(new PutObjectCommand(putObjectParams));
      } catch (error: unknown) {
        throw fileManagerWriteError(`Error writing object to S3: ${error}`);
      }
    },

    async readObject(s3KeyFile: string): Promise<Readable> {
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

        // It's safe to cast s3Object.Body to Readable because, in a Node.js environment,
        // s3Object.Body will either be an IncomingMessage or another Readable type,
        // as specified in NodeJsRuntimeStreamingBlobPayloadOutputTypes, which is part of
        // the StreamingBlobPayloadOutputTypes union type.
        return s3Object.Body as Readable;
      } catch (error: unknown) {
        throw fileManagerReadError(`Failed to read object: ${error}`);
      }
    },

    buildS3Key(
      tenantId: string,
      date: string,
      tracingId: string,
      version: number,
      correlationId: string,
    ): string {
      const formattedDate = new Date(date).toISOString().split("T")[0];

      return `tenantId=${tenantId}/date=${formattedDate}/tracingId=${tracingId}/version=${version}/correlationId=${correlationId}/${tracingId}.csv`;
    },
  };
};

export type FileManager = ReturnType<typeof fileManagerBuilder>;
