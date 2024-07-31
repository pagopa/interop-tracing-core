import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../utilities/config.js";
import { writeObjectS3BucketError } from "../model/domain/errors.js";
import fs from "fs";
import path from "path";
import { ExpressMulterFile } from "../model/multer.js";

export const bucketServiceBuilder = (s3Client: S3Client) => {
  return {
    async writeObject(
      file: ExpressMulterFile,
      bucketS3Key: string,
      useReplacementBucket?: boolean,
    ): Promise<void> {
      try {
        const filePath = path.resolve(file.path);
        const fileData = await fs.promises.readFile(filePath);

        const putObjectParams = {
          Bucket: useReplacementBucket
            ? config.bucketS3ReplacementName
            : config.bucketS3Name,
          Key: bucketS3Key,
          Body: fileData,
          ContentType: file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(putObjectParams));
      } catch (error: unknown) {
        throw writeObjectS3BucketError(
          `Unable to write tracing with pathName: ${bucketS3Key}. Details: ${error}`,
        );
      }
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
