FROM node:20.11.1-slim as build

RUN corepack enable

WORKDIR /app
COPY package.json /app/
COPY pnpm-lock.yaml /app/
COPY pnpm-workspace.yaml /app/

COPY ./packages/tracing-missing-data-checker/package.json /app/packages/tracing-missing-data-checker/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json
COPY ./packages/clients/eservice-operations/package.json /app/packages/clients/eservice-operations/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json /app/
COPY turbo.json /app/
COPY ./packages/tracing-missing-data-checker /app/packages/tracing-missing-data-checker
COPY ./packages/tracing-operations/open-api /app/packages/tracing-operations/open-api
COPY ./packages/commons /app/packages/commons
COPY ./packages/models /app/packages/models
COPY ./packages/clients/tracing-operations /app/packages/clients/tracing-operations

RUN pnpm build
RUN rm -rf /app/packages/tracing-missing-data-checker/dist/test

WORKDIR /app/packages/tracing-missing-data-checker

CMD [ "node", "." ]