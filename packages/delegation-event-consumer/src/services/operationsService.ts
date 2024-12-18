import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiSaveDelegationPayload,
  ApiSaveDelegationHeaders,
  ApiSaveDelegationResponse,
} from "pagopa-interop-tracing-operations-client";
import { errorSaveDelegation } from "../models/domain/errors.js";
import { Logger } from "pagopa-interop-tracing-commons";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => {
  return {
    async saveDelegation(
      headers: ApiSaveDelegationHeaders,
      data: ApiSaveDelegationPayload,
      logger: Logger,
    ): Promise<ApiSaveDelegationResponse> {
      try {
        await operationsApiClient.saveDelegation(
          {
            id: data.id,
            delegateId: data.delegateId,
            eserviceId: data.eserviceId,
            state: data.state,
          },
          {
            headers,
          },
        );

        logger.info(
          `Delegation saved with delegationId: ${data.delegationId}.`,
        );
      } catch (error: unknown) {
        throw errorSaveDelegation(
          `Error saving delegation with delegationId: ${
            data.id
          }. Details: ${error}. Data: ${JSON.stringify(data)}`,
        );
      }
    },
  };
};

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
