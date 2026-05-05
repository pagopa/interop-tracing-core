import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiDeletePurposesErrorsHeaders,
  ApiDeletePurposesErrorsResponse,
} from "pagopa-interop-tracing-operations-client";
import { errorDeletePurposesErrors } from "../model/domain/errors.js";
import { Logger } from "pagopa-interop-tracing-commons";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => {
  return {
    async deletePurposesErrors(
      headers: ApiDeletePurposesErrorsHeaders,
      logger: Logger,
    ): Promise<ApiDeletePurposesErrorsResponse> {
      try {
        await operationsApiClient.deletePurposesErrors(undefined, {
          headers,
        });

        logger.info(`Delete purposes errors.`);
      } catch (error: unknown) {
        throw errorDeletePurposesErrors(
          `Error delete purposes errors. Details: ${error}`,
        );
      }
    },
  };
};

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
