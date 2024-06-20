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
import { logger } from "../logging/index.js";
import { ConsumerConfig } from "../config/consumerConfig.js";

const serializeError = (error: unknown): string => {
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch (e) {
    return `${error}`;
  }
};

const processExit = async (exitStatusCode: number = 1): Promise<void> => {
  logger.error(`Process exit with code ${exitStatusCode}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit(exitStatusCode);
};

export const instantiateClient = (config: SQSClientConfig): SQSClient => {
  const sqsClient = new SQSClient({
    region: config.region,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID || "",
      secretAccessKey: process.env.SECRET_ACCESS_KEY || "",
    },
  });
  return sqsClient;
};

const processQueue = async (
  sqsClient: SQSClient,
  config: { queueUrl: string; runUntilQueueIsEmpty?: boolean } & ConsumerConfig,
  consumerHandler: (messagePayload: Message) => void,
): Promise<void> => {
  const command = new ReceiveMessageCommand({
    QueueUrl: config.queueUrl,
    WaitTimeSeconds: config.consumerPollingTimeout,
    MaxNumberOfMessages: 10,
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

        await consumerHandler(message);
        await deleteMessage(sqsClient, config.queueUrl, message.ReceiptHandle);
      }
    }
  } while (keepProcessingQueue);
};

export const runConsumer = async (
  sqsClient: SQSClient,
  config: { queueUrl: string; runUntilQueueIsEmpty?: boolean } & ConsumerConfig,
  consumerHandler: (messagePayload: Message) => void,
): Promise<void> => {
  logger.info(`Consumer processing on Queue: ${config.queueUrl}`);

  try {
    await processQueue(sqsClient, config, consumerHandler);
  } catch (e) {
    logger.error(
      `Generic error occurs processing Queue: ${
        config.queueUrl
      }. Details: ${serializeError(e)}`,
    );
    await processExit();
  }

  logger.info(`Queue processing Completed for Queue: ${config.queueUrl}`);
};

export const sendMessage = async (
  sqsClient: SQSClient,
  queueUrl: string,
  messageBody: string,
  messageGroupId?: string,
): Promise<void> => {
  const messageCommandInput: SendMessageCommandInput = {
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  };

  if (messageGroupId) {
    messageCommandInput.MessageGroupId = messageGroupId;
  }

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
