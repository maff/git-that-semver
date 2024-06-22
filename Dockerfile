# compile stage
FROM oven/bun:1-alpine AS compile

ENV HUSKY=0

RUN mkdir -p /temp/compile
WORKDIR /temp/compile

COPY . .
RUN bun install --frozen-lockfile
RUN bun build ./index.ts --compile --outfile git-that-semver

# release stage
FROM oven/bun:1-alpine AS release

ENV NODE_ENV=production

RUN apk add git

COPY entrypoint.sh /entrypoint.sh
COPY --from=compile /temp/compile/git-that-semver /usr/local/bin/git-that-semver

ENTRYPOINT [ "/entrypoint.sh" ]
