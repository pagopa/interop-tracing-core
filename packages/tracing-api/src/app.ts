import helmet from "helmet";
import express from "express";
import cors, { CorsOptions } from "cors";
import {
  ExpressContext,
  authenticationMiddleware,
  contextMiddleware,
  zodiosCtx,
} from "pagopa-interop-tracing-commons";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import tracingRouter from "./routers/tracingRouter.js";
import healthRouter from "./routers/healthRouter.js";
import { config } from "./utilities/config.js";
import { S3Client } from "@aws-sdk/client-s3";
import {
  BucketService,
  bucketServiceBuilder,
} from "./services/bucketService.js";
import {
  OperationsService,
  operationsServiceBuilder,
} from "./services/operationsService.js";
import { configureMulterEndpoints } from "./routers/config/multer.js";
import { queryParamsMiddleware } from "./middlewares/query.js";
import { ZodiosApp } from "@zodios/express";
import { ApiExternal } from "./model/types.js";

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const operationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

const s3client: S3Client = new S3Client({ region: config.awsRegion });
const bucketService: BucketService = bucketServiceBuilder(s3client);

const app: ZodiosApp<ApiExternal, ExpressContext> = zodiosCtx.app();

// Disable the "X-Powered-By: Express" HTTP header for security reasons.
// See https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html#recommendation_16
app.disable("x-powered-by");

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'"],
      styleSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  }),
);

app.use(cors());

app.use(
  helmet.hsts({
    includeSubDomains: true,
    maxAge: 10886400,
  }),
);

app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.frameguard({ action: "deny" }));

const corsOptions: CorsOptions = {
  origin: config.corsOriginAllowed,
  methods: ["POST", "PUT", "GET", "OPTIONS", "DELETE"],
  allowedHeaders: "*",
};

app.use(queryParamsMiddleware);
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(contextMiddleware(config.applicationName));
app.use(authenticationMiddleware);

configureMulterEndpoints(app);
app.use(tracingRouter(zodiosCtx)(operationsService, bucketService));
app.use(healthRouter);

export default app;
