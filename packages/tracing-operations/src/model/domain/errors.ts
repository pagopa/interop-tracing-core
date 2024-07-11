import { makeApiProblemBuilder } from "pagopa-interop-tracing-models";

export const errorCodes = {};

export type ErrorCodes = keyof typeof errorCodes;

export const makeApiProblem = makeApiProblemBuilder(errorCodes);
