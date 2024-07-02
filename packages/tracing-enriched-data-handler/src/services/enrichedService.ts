import { BucketService } from "./bucketService.js";
import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";

export const enrichedServiceBuilder = (
  dbService: DBService,
  bucketService: BucketService,
  producerService: ProducerService,
) => {
  return {
    async insertTracing(message: unknown): Promise<{}> {
      const s3KeyPath = message as string;
      const tracingId = "";
      const records = await bucketService.readObject(s3KeyPath);
      const result = await dbService.insertTracing(tracingId, records);
      if (!records || !result) {
        return await producerService.sendErrorMessage({ error: "" });
      } else {
        return Promise.resolve({});
      }
    },
  };
};

export type EnrichedService = ReturnType<typeof enrichedServiceBuilder>;
