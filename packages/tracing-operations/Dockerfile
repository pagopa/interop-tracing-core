FROM node:20.11.1-slim as build

RUN corepack enable

WORKDIR /app
COPY package.json /app/
COPY pnpm-lock.yaml /app/
COPY pnpm-workspace.yaml /app/

COPY ./packages/tracing-operations/package.json /app/packages/tracing-operations/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json
COPY ./packages/clients/eservice-operations/package.json /app/packages/clients/eservice-operations/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json /app/
COPY turbo.json /app/
COPY ./packages/tracing-operations /app/packages/tracing-operations
COPY ./packages/commons /app/packages/commons
COPY ./packages/models /app/packages/models
COPY ./packages/clients/eservice-operations /app/packages/clients/eservice-operations

RUN pnpm build
RUN rm -rf /app/packages/tracing-operations/dist/test

WORKDIR /app/packages/tracing-operations

CMD [ "node", "." ]