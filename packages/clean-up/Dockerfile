FROM node:20.11.1-slim as build

RUN corepack enable

WORKDIR /app
COPY package.json /app/
COPY pnpm-lock.yaml /app/
COPY pnpm-workspace.yaml /app/

COPY ./packages/clean-up/package.json /app/packages/clean-up/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json
COPY ./packages/clients/operations/package.json /app/packages/clients/operations/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json /app/
COPY turbo.json /app/
COPY ./packages/clean-up /app/packages/clean-up
COPY ./packages/operations/open-api /app/packages/operations/open-api
COPY ./packages/commons /app/packages/commons
COPY ./packages/models /app/packages/models
COPY ./packages/clients/operations /app/packages/clients/operations

RUN pnpm build
RUN rm -rf /app/packages/clean-up/dist/test

WORKDIR /app/packages/clean-up

CMD [ "node", "." ]