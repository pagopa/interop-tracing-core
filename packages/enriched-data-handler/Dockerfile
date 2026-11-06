FROM node:24.22.1-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c as build

RUN corepack enable

WORKDIR /app
COPY package.json /app/
COPY pnpm-lock.yaml /app/
COPY pnpm-workspace.yaml /app/

COPY ./packages/enriched-data-handler/package.json /app/packages/enriched-data-handler/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json /app/
COPY turbo.json /app/
COPY ./packages/enriched-data-handler /app/packages/enriched-data-handler
COPY ./packages/commons /app/packages/commons
COPY ./packages/models /app/packages/models

RUN pnpm build
RUN rm -rf /app/packages/enriched-data-handler/dist/test

RUN groupadd -r app && useradd -rm -g app app
RUN chown -R app:app /app && chmod -R 700 /app
USER app

WORKDIR /app/packages/enriched-data-handler

CMD [ "node", "." ]
