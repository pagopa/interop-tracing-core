import {
  contextMiddleware,
  loggerMiddleware,
} from "pagopa-interop-tracing-commons";
import operationsRouter from "./routers/operationsRouter.js";
import { config } from "./utilities/config.js";
import { localZodiosCtx } from "./context/index.js";
import healthRouter from "./routers/healthRouter.js";

const app = localZodiosCtx.app();

// Disable the "X-Powered-By: Express" HTTP header for security reasons.
// See https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html#recommendation_16
app.disable("x-powered-by");
app.use(healthRouter);
app.use(contextMiddleware(config.applicationName));
app.use(loggerMiddleware(config.applicationName));
app.use(operationsRouter(localZodiosCtx));

export default app;
