import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../utilities/config.js";
import { Tracing } from "../model/domain/db.js";
import { ISODateFormat } from "pagopa-interop-tracing-commons";

export const bucketServiceBuilder = (s3Client: S3Client) => {
  return {
    async copyObject(tracing: Tracing, correlationId: string) {
      const sourceBucket = config.bucketReplacementS3Name;
      const destinationBucket = config.bucketS3Name;
      const s3KeyFile = buildS3Key(tracing, correlationId);
      const copySource = `${sourceBucket}/${s3KeyFile}`;

      const params = {
        Bucket: destinationBucket,
        Key: s3KeyFile,
        CopySource: copySource,
      };

      try {
        await s3Client.send(new CopyObjectCommand(params));
      } catch (error: unknown) {
        throw new Error(
          `Error copying object from bucket with path: ${s3KeyFile}. Details: ${JSON.stringify(
            error,
          )}`,
        );
      }
    },
  };
};
const buildS3Key = (tracing: Tracing, correlationId: string): string =>
  `tenantId=${tracing.tenant_id}/date=${ISODateFormat.parse(
    tracing.date,
  )}/tracingId=${tracing.id}/version=${
    tracing.version
  }/correlationId=${correlationId}/${tracing.id}.csv`;

export type BucketService = ReturnType<typeof bucketServiceBuilder>;
