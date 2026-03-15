# compile stage
FROM oven/bun:1-alpine AS compile

ENV HUSKY=0
ARG GTS_VERSION=dev

RUN mkdir -p /temp/compile
WORKDIR /temp/compile

COPY . .
RUN bun install --frozen-lockfile
RUN bun build ./index.ts --compile --outfile git-that-semver --define __GTS_VERSION__="\"${GTS_VERSION}\""

# release stage
FROM alpine:3 AS release

RUN apk add --no-cache git libstdc++ libgcc

COPY entrypoint.sh /entrypoint.sh
COPY entrypoint-action.sh /entrypoint-action.sh
COPY --from=compile /temp/compile/git-that-semver /usr/local/bin/git-that-semver

ENTRYPOINT [ "/entrypoint.sh" ]
