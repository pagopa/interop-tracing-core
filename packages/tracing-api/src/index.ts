import { genericLogger } from "pagopa-interop-tracing-commons";
import { config } from "./utilities/config.js";
import app from "./app.js";

app.listen(config.port, config.host, () => {
  genericLogger.info(`listening on ${config.host}:${config.port}`);
});

import http from "http";

// Get an array of accepted status codes
const acceptedStatusCodes = Object.keys(http.STATUS_CODES).map(Number);

console.log(acceptedStatusCodes);
