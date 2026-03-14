# GitHub Actions Usage Guide

This guide shows how to use the `git-that-semver` GitHub Action in real-world CI/CD pipelines.

## Basic Usage

```yaml
steps:
  - uses: actions/checkout@v6
    with:
      fetch-depth: 0 # required — GTS needs full git history

  - id: gts
    uses: maff/git-that-semver@v1

  - run: echo "Docker version: ${{ steps.gts.outputs.GTS_DOCKER_VERSION }}"
```

By default, the action outputs individual environment variables. All `GTS_*` keys are available as step outputs.

## Action Inputs

| Input  | Default   | Description                                             |
| ------ | --------- | ------------------------------------------------------- |
| `env`  | `"true"`  | Output individual environment variables                 |
| `json` | `"false"` | Output full result as JSON in `GTS_JSON`                |
| `yaml` | `"false"` | Output full result as YAML in `GTS_YAML`                |
| `args` | `""`      | Additional CLI arguments (e.g. `-e npm -e java -c ...`) |

## Enabling Strategies

By default, only the `docker` strategy is enabled. Use `args` to enable additional strategies:

```yaml
- id: gts
  uses: maff/git-that-semver@v1
  with:
    args: "-e npm -e java"
```

## Configuration Overrides

Pass `-c` flags via `args` to override configuration values:

```yaml
- id: gts
  uses: maff/git-that-semver@v1
  with:
    args: "-c output.env.prefix=MY_APP_ -c defaults.snapshot.useChangeRequestIdentifier=false"
```

## Custom Config File

If your repository contains a `git-that-semver.yaml` config file, it is picked up automatically. To use a different path:

```yaml
- id: gts
  uses: maff/git-that-semver@v1
  with:
    args: "-f .ci/versioning.yaml"
```

## Passing Outputs Between Jobs

GTS typically runs in its own job, with downstream jobs consuming the outputs:

```yaml
jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      docker-version: ${{ steps.gts.outputs.GTS_DOCKER_VERSION }}
      docker-tags: ${{ steps.gts.outputs.GTS_DOCKER_TAGS }}
      is-release: ${{ steps.gts.outputs.GTS_IS_RELEASE_SEMVER_VERSION }}
      is-snapshot: ${{ steps.gts.outputs.GTS_IS_SNAPSHOT_VERSION }}
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - id: gts
        uses: maff/git-that-semver@v1

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npm test

  docker:
    runs-on: ubuntu-latest
    needs: [version, test]
    steps:
      - run: echo "Building ${{ needs.version.outputs.docker-version }}"
```

## End-to-End Example: Build and Push a Docker Image

A complete workflow that versions, tests, and publishes a Docker image:

```yaml
name: Build and Publish

on:
  push:
    branches: ["main"]
    tags: ["v*.*.*"]
  pull_request:
    branches: ["main"]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      docker-version: ${{ steps.gts.outputs.GTS_DOCKER_VERSION }}
      docker-tags: ${{ steps.gts.outputs.GTS_DOCKER_TAGS }}
      is-release: ${{ steps.gts.outputs.GTS_IS_RELEASE_SEMVER_VERSION }}
      is-highest-release: ${{ steps.gts.outputs.GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION }}
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - id: gts
        uses: maff/git-that-semver@v1

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npm test

  docker:
    runs-on: ubuntu-latest
    needs: [version, test]
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v6

      - uses: docker/setup-buildx-action@v4

      - uses: docker/login-action@v4
        if: github.event_name != 'pull_request'
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Convert GTS_DOCKER_TAGS (space-separated) to docker/metadata-action format
      - id: prepare-tags
        run: |
          {
            echo 'tags<<EOF'
            for tag in ${{ needs.version.outputs.docker-tags }}; do
              echo "type=raw,value=$tag"
            done
            echo EOF
          } >> "$GITHUB_OUTPUT"

      - uses: docker/metadata-action@v6
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: ${{ steps.prepare-tags.outputs.tags }}
          labels: |
            org.opencontainers.image.version=${{ needs.version.outputs.docker-version }}

      - uses: docker/build-push-action@v7
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    if: needs.version.outputs.is-release == 'true'
    runs-on: ubuntu-latest
    needs: [version, docker]
    steps:
      - run: echo "Deploying release ${{ needs.version.outputs.docker-version }}"
```

### What This Produces

| Scenario               | `GTS_DOCKER_VERSION`                      | `GTS_DOCKER_TAGS`                    |
| ---------------------- | ----------------------------------------- | ------------------------------------ |
| Push to `main`         | `1.1.0-20250315120000.abc123def456`       | version, full SHA, `main`            |
| Tag `v1.0.0` (highest) | `1.0.0`                                   | `1.0.0`, `1.0`, `1`, `latest`        |
| Tag `v1.0.1` (patch)   | `1.0.1`                                   | `1.0.1`, `1.0` (if highest in minor) |
| Tag `v2.0.0-beta.1`    | `2.0.0-beta.1`                            | `2.0.0-beta.1`                       |
| Pull request           | `1.1.0-pr-42.20250315120000.abc123def456` | version, full SHA                    |

## Conditional Logic with Version Flags

Use the `IS_*` flags to control workflow behavior:

```yaml
# Only deploy on release versions
deploy:
  if: needs.version.outputs.is-release == 'true'

# Only notify on the highest release (avoid noise for patch releases)
notify:
  if: needs.version.outputs.is-highest-release == 'true'

# Skip expensive steps on snapshot builds
integration-tests:
  if: needs.version.outputs.is-snapshot != 'true'
```

## JSON Output

For complex pipelines that need structured access to all version data:

```yaml
- id: gts
  uses: maff/git-that-semver@v1
  with:
    json: "true"
    args: "-e npm -e docker"

- run: |
    echo '${{ steps.gts.outputs.GTS_JSON }}' | jq '.strategies.docker.version'
```

## Important Notes

### `fetch-depth: 0` Is Required

GTS needs full git history to analyze tags. Without `fetch-depth: 0`, the checkout creates a shallow clone and GTS cannot determine previous versions or compute version flags correctly.

### Job Summary

The action automatically writes its output to the GitHub Actions job summary, giving you a quick overview of the resolved version directly in the workflow run UI.
