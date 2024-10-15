FROM node:20.11.1-slim as build

RUN corepack enable

WORKDIR /app
COPY package.json /app/
COPY pnpm-lock.yaml /app/
COPY pnpm-workspace.yaml /app/

COPY ./packages/minio-webhook/package.json /app/packages/minio-webhook/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json /app/
COPY turbo.json /app/
COPY ./packages/minio-webhook /app/packages/minio-webhook
COPY ./packages/commons /app/packages/commons

RUN pnpm build
RUN rm -rf /app/packages/minio-webhook/dist/test

WORKDIR /app/packages/minio-webhook

CMD [ "node", "." ]