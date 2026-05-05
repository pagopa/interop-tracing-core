import { zodiosRouter } from "@zodios/express";
import { api } from "pagopa-interop-tracing-operations-client";

const healthRouter = zodiosRouter(api.api);

healthRouter.get("/status", async (_, res) => res.status(200).end());

export default healthRouter;
