/* eslint-disable no-constant-condition */
import {
  SQSClient,
  ReceiveMessageCommand,
  SendMessageCommand,
  DeleteMessageCommand,
  Message,
  SQSClientConfig,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { genericLogger } from "../logging/index.js";
import { ConsumerConfig } from "../config/consumerConfig.js";
import { InternalError } from "pagopa-interop-tracing-models";
import { logger } from "../logging/index.js";

const serializeError = (error: unknown): string => {
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch (e) {
    return `${error}`;
  }
};

const processExit = async (exitStatusCode: number = 1): Promise<void> => {
  genericLogger.error(`Process exit with code ${exitStatusCode}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit(exitStatusCode);
};

export const instantiateClient = (config: SQSClientConfig): SQSClient => {
  const sqsClient = new SQSClient({
    region: config.region,
  });
  return sqsClient;
};

const processQueue = async (
  sqsClient: SQSClient,
  config: { queueUrl: string; runUntilQueueIsEmpty?: boolean } & ConsumerConfig,
  consumerHandler: (messagePayload: Message) => Promise<void>,
): Promise<void> => {
  const command = new ReceiveMessageCommand({
    QueueUrl: config.queueUrl,
    WaitTimeSeconds: config.consumerPollingTimeout,
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ["All"],
  });

  let keepProcessingQueue: boolean = true;

  do {
    const { Messages } = await sqsClient.send(command);

    if (config.runUntilQueueIsEmpty && (!Messages || Messages?.length === 0)) {
      keepProcessingQueue = false;
    }

    if (Messages?.length) {
      for (const message of Messages) {
        if (!message.ReceiptHandle) {
          throw new Error(
            `ReceiptHandle not found in Message: ${JSON.stringify(message)}`,
          );
        }

        try {
          await consumerHandler(message);
          await deleteMessage(
            sqsClient,
            config.queueUrl,
            message.ReceiptHandle,
          );
        } catch (e) {
          if (!(e instanceof InternalError)) throw e;
        }
      }
    }
  } while (keepProcessingQueue);
};

export const runConsumer = async (
  sqsClient: SQSClient,
  config: {
    serviceName: string;
    queueUrl: string;
    runUntilQueueIsEmpty?: boolean;
  } & ConsumerConfig,
  consumerHandler: (messagePayload: Message) => Promise<void>,
): Promise<void> => {
  logger({ serviceName: config.serviceName }).info(
    `Consumer processing on Queue: ${config.queueUrl}`,
  );

  try {
    await processQueue(sqsClient, config, consumerHandler);
  } catch (e) {
    logger({ serviceName: config.serviceName }).error(
      `Generic error occurs processing Queue: ${
        config.queueUrl
      }. Details: ${serializeError(e)}`,
    );
    await processExit();
  }

  logger({ serviceName: config.serviceName }).info(
    `Queue processing Completed for Queue: ${config.queueUrl}`,
  );
};

export const sendMessage = async (
  sqsClient: SQSClient,
  queueUrl: string,
  messageBody: string,
  correlationId: string,
  messageGroupId?: string,
): Promise<void> => {
  const messageCommandInput: SendMessageCommandInput = {
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  };

  if (messageGroupId) {
    messageCommandInput.MessageGroupId = messageGroupId;
  }

  messageCommandInput.MessageAttributes = {
    correlationId: {
      DataType: "String",
      StringValue: correlationId,
    },
  };

  const command = new SendMessageCommand(messageCommandInput);

  await sqsClient.send(command);
};

export const deleteMessage = async (
  sqsClient: SQSClient,
  queueUrl: string,
  receiptHandle: string,
): Promise<void> => {
  const deleteCommand = new DeleteMessageCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  });

  await sqsClient.send(deleteCommand);
};

export { SQSClient, SQSClientConfig, Message };
