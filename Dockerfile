# compile stage
FROM oven/bun:1-alpine AS compile

RUN mkdir -p /temp/compile
WORKDIR /temp/compile

COPY . .
RUN bun install --frozen-lockfile
RUN bun build ./index.ts --compile --outfile gsr

# release stage
FROM oven/bun:1-alpine AS release

ENV NODE_ENV=production

RUN apk add git

COPY --from=compile /temp/compile/gsr /usr/local/bin/gsr

ENTRYPOINT [ "gsr" ]
