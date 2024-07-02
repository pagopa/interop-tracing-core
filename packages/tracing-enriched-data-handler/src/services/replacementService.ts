import { DBService } from "./db/dbService.js";
import { ProducerService } from "./producerService.js";

export const replacementServiceBuilder = (
  dbService: DBService,
  producerService: ProducerService,
) => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteTracing(_message: unknown): Promise<unknown> {
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
