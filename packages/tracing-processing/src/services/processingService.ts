import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";

export const processingServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  return {
    async processTracing(
      message: unknown,
    ): Promise<{ error: boolean; value: object }> {
      const s3KeyPath = message as string;
      const tracingId = "";
      const records = await bucketService.readObject(s3KeyPath);
      const purposes = await dbService.getPurposesByTracingId(tracingId);

      if (!records) {
        await producerService.sendErrorMessage({ error: "" });
      } else {
        await bucketService.writeObject({ records, ...purposes });
      }

      return Promise.resolve({ error: !!records, value: {} });
    },
  };
};

export type ProcessingService = ReturnType<typeof processingServiceBuilder>;
