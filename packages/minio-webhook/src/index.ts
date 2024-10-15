import axios from "axios";
import express, { Request, Response } from "express";
import { config } from "./utilities/config.js";
import { genericLogger } from "pagopa-interop-tracing-commons";

const app = express();
app.use(express.json());

app.post("/webhook/:queue", async (req: Request, res: Response) => {
  try {
    genericLogger.info(
      `Received event for queue: ${req.params.queue} eventData ${JSON.stringify(
        req.body,
      )}`,
    );

    const queueUrl = `${config.elasticMQ}/${req.params.queue}`;
    const body = new URLSearchParams({
      Action: "SendMessage",
      MessageBody: JSON.stringify(req.body),
    });
    const response = await axios.post(queueUrl, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    genericLogger.info(
      `Message forwarded to ElasticMQ: ${queueUrl}. Response: ${JSON.stringify(
        response.data,
      )}`,
    );
    return res.status(200).send("Event processed successfully");
  } catch (error) {
    genericLogger.error(`Error processing event: ${error}`);
    return res.status(500).send("Internal server error");
  }
});

app.listen(config.port, () => {
  console.log(`Minio Webhook server running on port ${config.port}`);
});
