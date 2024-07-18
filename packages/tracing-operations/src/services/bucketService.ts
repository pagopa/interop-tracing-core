import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../utilities/config.js";
import { Logger } from "pagopa-interop-tracing-commons";
import { copyObjectS3BucketError } from "../model/domain/errors.js";

export const bucketServiceBuilder = (s3Client: S3Client) => {
  return {
    async copyObject(bucketS3Key: string, logger: Logger) {
      try {
        logger.info(
          `Copying file bucketS3Key ${bucketS3Key} from sourceBucket: ${config.bucketReplacementS3Name} to destinationBucket: ${config.bucketS3Name}`,
        );

        const params = {
          Bucket: config.bucketReplacementS3Name,
          Key: bucketS3Key,
          CopySource: `${config.bucketReplacementS3Name}/${bucketS3Key}`,
        };

        await s3Client.send(new CopyObjectCommand(params));
      } catch (error: unknown) {
        throw copyObjectS3BucketError(
          `Error copying file bucketS3Key ${bucketS3Key} from sourceBucket: ${
            config.bucketReplacementS3Name
          } to destinationBucket: ${
            config.bucketS3Name
          }. Details: ${JSON.stringify(error)}`,
        );
      }
    },
  };
};

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
