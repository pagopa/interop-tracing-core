import {
  contextMiddleware,
  loggerMiddleware,
  zodiosCtx,
} from "pagopa-interop-tracing-commons";
import operationsRouter from "./routers/operationsRouter.js";
import { config } from "../src/utilities/config.js";
const app = zodiosCtx.app();

// Disable the "X-Powered-By: Express" HTTP header for security reasons.
// See https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html#recommendation_16
app.disable("x-powered-by");
app.use(contextMiddleware(config.applicationName));
app.use(loggerMiddleware(config.applicationName));
app.use(operationsRouter(zodiosCtx));

export default app;
