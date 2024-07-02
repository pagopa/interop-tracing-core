import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";

export const replacementServiceBuilder = (
  dbService: DBService,
  producerService: ProducerService,
) => {
  return {
    async deleteTracing(_message: unknown): Promise<{}> {
      const tracingId = "";
      const result = await dbService.deleteTracing(tracingId);
      if (!result) {
        return producerService.sendErrorMessage({});
      }
      return Promise.resolve({});
    },
  };
};

export type ReplacementServiceBuilder = ReturnType<
  typeof replacementServiceBuilder
>;
