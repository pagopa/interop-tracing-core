import { genericInternalError } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(_db: DB) {
  return {
    async getTenantByPurposeId() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error getTenantByPurposeId: ${error}`);
      }
    },

    async getTracings() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error getTracings: ${error}`);
      }
    },

    async getTracingErrorDetails() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error getTracingErrorDetails: ${error}`);
      }
    },

    async submitTracing() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error createTracing: ${error}`);
      }
    },

    async recoverTracing() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error updateTracingOnError: ${error}`);
      }
    },
    async replaceTracing() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`error: ${error}`);
      }
    },

    async updateState() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error update state: ${error}`);
      }
    },
    async savePurposeError() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error save purpose error: ${error}`);
      }
    },
    async deletePurposesError() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error delete purpose error: ${error}`);
      }
    },
    async saveMissingTracing() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(
          `Error save missing tracing error: ${error}`,
        );
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
