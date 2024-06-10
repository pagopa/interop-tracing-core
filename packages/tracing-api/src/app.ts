import helmet from "helmet";
import express, { NextFunction, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import {
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

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const operationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

const s3client: S3Client = new S3Client({ region: config.awsRegion });
const bucketService: BucketService = bucketServiceBuilder(s3client);

const app = zodiosCtx.app();

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

/**
 * Middleware to preprocess the 'state' query parameter.
 * Ensures the 'state' parameter is always handled as an array.
 *
 * The issue arises when a query parameter that Zodios expects to handle as an array
 * contains a single element. In such cases, it is treated as a string, leading to validation errors.
 * To address this, the middleware converts the parameter to an array to ensure correct validation preserving schema integrity.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.query.state && typeof req.query.state === "string") {
    req.query.state = req.query.state.split(",");
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(contextMiddleware(config.applicationName));
app.use(authenticationMiddleware);
app.use(healthRouter);
app.use(tracingRouter(zodiosCtx)(operationsService, bucketService));

export default app;
