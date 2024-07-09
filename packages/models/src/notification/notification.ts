import { z } from "zod";

export const S3ObjectSchema = z.object({
  key: z.string(),
  size: z.number(),
  eTag: z.string(),
  sequencer: z.string(),
});

export const S3BucketSchema = z.object({
  name: z.string(),
  ownerIdentity: z.object({
    principalId: z.string(),
  }),
  arn: z.string(),
});

export const S3Schema = z.object({
  s3SchemaVersion: z.string(),
  configurationId: z.string(),
  bucket: S3BucketSchema,
  object: S3ObjectSchema,
});

export const ResponseElementsSchema = z.object({
  "x-amz-request-id": z.string(),
  "x-amz-id-2": z.string(),
});

export const RequestParametersSchema = z.object({
  sourceIPAddress: z.string(),
});

export const UserIdentitySchema = z.object({
  principalId: z.string(),
});

export const RecordSchema = z.object({
  eventVersion: z.string(),
  eventSource: z.string(),
  awsRegion: z.string(),
  eventTime: z.string(),
  eventName: z.string(),
  userIdentity: UserIdentitySchema,
  requestParameters: RequestParametersSchema,
  responseElements: ResponseElementsSchema,
  s3: S3Schema,
});

export const S3BodySchema = z.object({
  Records: z.array(RecordSchema).nonempty(),
});

export type S3BodySchema = z.infer<typeof S3BodySchema>;
