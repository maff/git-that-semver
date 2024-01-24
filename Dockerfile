FROM oven/bun:1-alpine as base
WORKDIR /usr/src/app

# dependencies stage
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# release stage
FROM base AS release

RUN apk add git

ENV NODE_ENV=production
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

USER bun
ENTRYPOINT [ "bun", "run", "index.ts" ]
