import { generateAuthToken } from "aws-msk-iam-sasl-signer-js";

import {
  Consumer,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  OauthbearerProviderResponse,
  logLevel,
} from "kafkajs";
import {
  genericLogger,
  KafkaConsumerConfig,
  Logger,
} from "pagopa-interop-tracing-commons";
import { kafkaMessageProcessError } from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";

const errorTypes = ["unhandledRejection", "uncaughtException"];
const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];

const processExit = (code: number = 1): void => {
  genericLogger.info(`Process exit with code ${code}`);
  process.exit(code);
};

async function oauthBearerTokenProvider(
  region: string,
  logger: Logger,
): Promise<OauthbearerProviderResponse> {
  logger.debug("Retrieving token from AWS");

  const authTokenResponse = await generateAuthToken({
    region,
  });

  logger.debug(
    `Token fetched from AWS expires at ${authTokenResponse.expiryTime}`,
  );

  return {
    value: authTokenResponse.token,
  };
}

/**
 * Method that decide the kafka configuration based on need for AWS IAM authentication
 *
 * @param config
 * @returns
 */
const getKafkaConfig = (config: KafkaConsumerConfig): KafkaConfig => {
  const kafkaBaseConfig = {
    clientId: config.kafkaClientId,
    brokers: config.kafkaBrokers,
    logLevel: config.kafkaLogLevel,
  };

  return config.kafkaDisableAwsIamAuth
    ? {
        ...kafkaBaseConfig,
        ssl: false,
      }
    : {
        ...kafkaBaseConfig,
        reauthenticationThreshold: config.kafkaReauthenticationThreshold,
        ssl: true,
        sasl: {
          mechanism: "oauthbearer",
          oauthBearerProvider: () =>
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            oauthBearerTokenProvider(config.awsRegion!, genericLogger),
        },
      };
};

export const initConsumer = async (
  config: KafkaConsumerConfig,
  topics: string[],
  consumerHandler: (payload: EachMessagePayload) => Promise<void>,
): Promise<Consumer> => {
  genericLogger.info(
    `Initializing kafka consumer, listening on topics: ${topics}`,
  );

  const kafkaConfig = getKafkaConfig(config);

  const kafka = new Kafka({
    ...kafkaConfig,
    logCreator:
      (_logLevel) =>
      ({ level, log }) => {
        const { message, error } = log;

        const filteredLevel = match(error)
          .with(
            P.string,
            (error) =>
              (level === logLevel.ERROR || level === logLevel.WARN) &&
              error.includes("The group is rebalancing, so a rejoin is needed"),
            () => logLevel.INFO,
          )
          .otherwise(() => level);

        // eslint-disable-next-line sonarjs/no-nested-template-literals
        const msg = `${message}${error ? ` - ${error}` : ""}`;

        match(filteredLevel)
          .with(logLevel.NOTHING, logLevel.ERROR, () =>
            genericLogger.error(msg),
          )
          .with(logLevel.WARN, () => genericLogger.warn(msg))
          .with(logLevel.INFO, () => genericLogger.info(msg))
          .with(logLevel.DEBUG, () => genericLogger.debug(msg))
          .otherwise(() => genericLogger.error(msg));
      },
  });

  // -- Consumer ---

  const consumer = kafka.consumer({
    groupId: config.kafkaGroupId,
    retry: {
      initialRetryTime: 100,
      maxRetryTime: 3000,
      retries: 3,
      restartOnFailure: (error) => {
        genericLogger.error(`Error on restarting service: ${error.message}`);
        return Promise.resolve(false);
      },
    },
  });

  kafkaEventsListener(consumer);
  errorEventsListener(consumer);

  await consumer.connect();
  genericLogger.info("Consumer kafka is connected");

  const isTopicsAvailable = await validateTopicMetadata(kafka, topics);
  if (!isTopicsAvailable) {
    processExit();
  }

  await consumer.subscribe({
    topics,
    fromBeginning: config.topicStartingOffset === "earliest",
  });

  genericLogger.info(`Consumer subscribed topic ${topics}`);

  await consumer.run({
    autoCommit: false,
    eachMessage: async (payload: EachMessagePayload) => {
      try {
        await consumerHandler(payload);
        await kafkaCommitMessageOffsets(consumer, payload);
      } catch (e) {
        throw kafkaMessageProcessError(
          payload.topic,
          payload.partition,
          payload.message.offset,
          e,
        );
      }
    },
  });

  return consumer;
};

const kafkaEventsListener = (consumer: Consumer): void => {
  if (genericLogger.isDebugEnabled()) {
    consumer.on(consumer.events.DISCONNECT, () => {
      genericLogger.info(`Consumer has disconnected.`);
    });

    consumer.on(consumer.events.STOP, (e) => {
      genericLogger.info(`Consumer has stopped ${JSON.stringify(e)}.`);
    });
  }

  consumer.on(consumer.events.CRASH, (e) => {
    genericLogger.error(`Error Consumer crashed ${JSON.stringify(e)}.`);
    processExit();
  });

  consumer.on(consumer.events.REQUEST_TIMEOUT, (e) => {
    genericLogger.error(
      `Error Request to a broker has timed out : ${JSON.stringify(e)}.`,
    );
  });
};

const errorEventsListener = (consumer: Consumer): void => {
  errorTypes.forEach((type) => {
    process.on(type, async (e) => {
      try {
        genericLogger.error(`Error ${type} intercepted; Error detail: ${e}`);
        await consumer.disconnect().finally(() => {
          genericLogger.debug("Consumer disconnected properly");
        });
        processExit();
      } catch (e) {
        genericLogger.error(
          `Unexpected error on consumer disconnection with event type ${type}; Error detail: ${e}`,
        );
        processExit();
      }
    });
  });

  signalTraps.forEach((type) => {
    process.once(type, async () => {
      try {
        await consumer.disconnect().finally(() => {
          genericLogger.info("Consumer disconnected properly");
          processExit();
        });
      } finally {
        process.kill(process.pid, type);
      }
    });
  });
};

export const validateTopicMetadata = async (
  kafka: Kafka,
  topicNames: string[],
): Promise<boolean> => {
  genericLogger.debug(
    `Check topics |${JSON.stringify(topicNames)}| existence...`,
  );

  const admin = kafka.admin();
  await admin.connect();

  try {
    const { topics } = await admin.fetchTopicMetadata({
      topics: [...topicNames],
    });
    genericLogger.debug(`Topic metadata: ${JSON.stringify(topics)} `);
    await admin.disconnect();
    return true;
  } catch (e) {
    await admin.disconnect();
    genericLogger.error(
      `Unable to subscribe! Error during topic metadata fetch: ${JSON.stringify(
        e,
      )}`,
    );
    return false;
  }
};

const kafkaCommitMessageOffsets = async (
  consumer: Consumer,
  payload: EachMessagePayload,
): Promise<void> => {
  const { topic, partition, message } = payload;
  await consumer.commitOffsets([
    { topic, partition, offset: (Number(message.offset) + 1).toString() },
  ]);

  genericLogger.debug(
    `Topic message offset ${Number(message.offset) + 1} committed`,
  );
};

export const runConsumer = async (
  config: KafkaConsumerConfig,
  topics: string[],
  consumerHandler: (messagePayload: EachMessagePayload) => Promise<void>,
): Promise<void> => {
  try {
    await initConsumer(config, topics, consumerHandler);
  } catch (e) {
    genericLogger.error(
      `Generic error occurs during consumer initialization: ${e}`,
    );
    processExit();
  }
};
