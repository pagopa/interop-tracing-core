import { z } from "zod";

export const ConsumerConfig = z
  .object({
    MAX_NUMBER_OF_MSGS: z.coerce.number().min(1).max(10).default(10),
    CONSUMER_POLLING_TIMEOUT_IN_SECONDS: z.coerce.number().min(1).default(10),
    VISIBILITY_TIMEOUT_SECONDS: z.coerce.number().min(10).default(30),
  })
  .transform((c) => ({
    maxNumberOfMessages: c.MAX_NUMBER_OF_MSGS,
    waitTimeSeconds: c.CONSUMER_POLLING_TIMEOUT_IN_SECONDS,
    visibilityTimeout: c.VISIBILITY_TIMEOUT_SECONDS,
  }));

export type ConsumerConfig = z.infer<typeof ConsumerConfig>;
