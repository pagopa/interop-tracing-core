import { genericInternalError } from "pagopa-interop-tracing-models";

export const producerServiceBuilder = () => {
  return {
    async sendErrorMessage(error: object): Promise<object> {
      try {
        return Promise.resolve(error);
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
  };
};

export type ProducerService = ReturnType<typeof producerServiceBuilder>;
