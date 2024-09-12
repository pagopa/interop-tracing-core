import { AxiosError, AxiosRequestHeaders } from "axios";
import { Problem } from "pagopa-interop-tracing-models";

export function mockOperationsApiClientError(error: Problem): AxiosError {
  const mockProblemAxiosError = new AxiosError(error.title);
  mockProblemAxiosError.response = {
    status: error.status,
    statusText: error.title,
    headers: {},
    config: {
      headers: {} as AxiosRequestHeaders,
    },
    data: error,
  };
  return mockProblemAxiosError;
}
