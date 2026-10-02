const http = require("node:http");

const port = Number(process.env.PORT ?? 5001);
const elasticMqUrl =
  process.env.ELASTICMQ_URL ?? "http://localhost:9324/000000000000";
const bucketQueueMap = JSON.parse(process.env.BUCKET_QUEUE_MAP ?? "{}");

function normalizeEventData(eventData) {
  if (!eventData || typeof eventData !== "object") {
    return eventData;
  }

  if (eventData.EventName?.startsWith("s3:")) {
    eventData.EventName = eventData.EventName.slice(3);
  }

  if (Array.isArray(eventData.Records)) {
    eventData.Records = eventData.Records.map((record) => ({
      ...record,
      eventName: record.eventName?.startsWith("s3:")
        ? record.eventName.slice(3)
        : record.eventName,
    }));
  }

  return eventData;
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function sendMessage(queue, event) {
  const body = new URLSearchParams({
    Action: "SendMessage",
    MessageBody: JSON.stringify(event),
  });

  const response = await fetch(`${elasticMqUrl}/${queue}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `ElasticMQ returned ${response.status} for queue ${queue}: ${await response.text()}`,
    );
  }
}

async function handleS3Event(request, response) {
  const requestBody = await collectRequestBody(request);
  const event = normalizeEventData(JSON.parse(requestBody));
  const records = Array.isArray(event.Records) ? event.Records : [];

  if (records.length === 0) {
    response.writeHead(202);
    response.end("No records to process");
    return;
  }

  for (const record of records) {
    const bucket = record?.s3?.bucket?.name;
    const queue = bucketQueueMap[bucket];

    if (!queue) {
      throw new Error(`No queue configured for bucket ${bucket}`);
    }

    await sendMessage(queue, { ...event, Records: [record] });
  }

  response.writeHead(200);
  response.end("Event processed successfully");
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "HEAD") {
      response.writeHead(200);
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (request.method === "POST" && request.url === "/webhook/s3-event") {
      await handleS3Event(request, response);
      return;
    }

    response.writeHead(404);
    response.end("Not found");
  } catch (error) {
    const errorDetails = String(error.stack ?? error).replace(/[\r\n]/g, " ");
    console.error(`Error processing S3 event: ${errorDetails}`);
    response.writeHead(500);
    response.end("Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`S3 event bridge listening on port ${port}`);
});
