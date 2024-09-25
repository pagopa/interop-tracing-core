FROM node:20.11.1-slim as build

RUN corepack enable

WORKDIR /app
COPY package.json /app/
COPY pnpm-lock.yaml /app/
COPY pnpm-workspace.yaml /app/

COPY ./packages/tenant-event-consumer/package.json /app/packages/tenant-event-consumer/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json
COPY ./packages/clients/operations/package.json /app/packages/clients/operations/package.json
COPY ./packages/kafka-connector/package.json /app/packages/kafka-connector/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json /app/
COPY turbo.json /app/
COPY ./packages/tenant-event-consumer /app/packages/tenant-event-consumer
COPY ./packages/operations/open-api /app/packages/operations/open-api
COPY ./packages/commons /app/packages/commons
COPY ./packages/kafka-connector /app/packages/kafka-connector
COPY ./packages/models /app/packages/models
COPY ./packages/clients/operations /app/packages/clients/operations

RUN pnpm build
RUN rm -rf /app/packages/tenant-event-consumer/dist/test

WORKDIR /app/packages/tenant-event-consumer

CMD [ "node", "." ]