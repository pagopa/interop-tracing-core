import z from "zod";

export const tracingState = {
  pending: "PENDING",
  completed: "COMPLETED",
  missing: "MISSING",
  error: "ERROR",
} as const;
export const TracingState = z.enum([
  Object.values(tracingState)[0],
  ...Object.values(tracingState).slice(1),
]);
export type TracingState = z.infer<typeof TracingState>;
