import {
  zodiosCtx,
  authenticationMiddleware,
  contextMiddleware,
} from "pagopa-interop-tracing-commons";
import operationsRouter from "./routers/operationsRouter.js";
const app = zodiosCtx.app();

// Disable the "X-Powered-By: Express" HTTP header for security reasons.
// See https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html#recommendation_16
app.disable("x-powered-by");
app.use(operationsRouter(zodiosCtx));
app.use(authenticationMiddleware);
app.use(contextMiddleware as unknown as string);

export default app;
