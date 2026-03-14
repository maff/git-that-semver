# GitLab CI Usage Guide

This guide shows how to use `git-that-semver` in GitLab CI pipelines.

## Basic Usage

GTS is distributed as a Docker image. Use it as a job image to generate version information:

```yaml
variables:
  GIT_DEPTH: 0 # required — GTS needs full git history

git-that-semver:
  stage: .pre
  image: ghcr.io/maff/git-that-semver:1
  script:
    - git-that-semver -e docker | tee git-that-semver.env
  artifacts:
    reports:
      dotenv: git-that-semver.env
```

This runs GTS in the `.pre` stage and exports all `GTS_*` variables to downstream jobs via the `dotenv` artifact report.

## Pinning the Version

Use Docker image tags to pin GTS to a specific version:

```yaml
image: ghcr.io/maff/git-that-semver:1       # latest v1.x.x (recommended)
image: ghcr.io/maff/git-that-semver:1.0      # latest v1.0.x
image: ghcr.io/maff/git-that-semver:1.0.0    # exact version
image: ghcr.io/maff/git-that-semver:latest    # latest release
```

## Enabling Strategies

By default, only the `docker` strategy is enabled. Pass additional flags to enable more:

```yaml
git-that-semver:
  stage: .pre
  image: ghcr.io/maff/git-that-semver:1
  script:
    - git-that-semver -e docker -e npm -e java | tee git-that-semver.env
  artifacts:
    reports:
      dotenv: git-that-semver.env
```

## Configuration Overrides

Override configuration values with `-c`:

```yaml
script:
  - git-that-semver -c output.env.prefix=MY_APP_ -c defaults.snapshot.useChangeRequestIdentifier=false | tee git-that-semver.env
```

## Custom Config File

If your repository contains a `git-that-semver.yaml`, it is picked up automatically. To use a custom path:

```yaml
script:
  - git-that-semver -f .ci/versioning.yaml | tee git-that-semver.env
```

## Using Variables Within the Same Job

To use GTS variables within the same job, use `eval`:

```yaml
git-that-semver:
  stage: .pre
  image: ghcr.io/maff/git-that-semver:1
  script:
    - eval $(git-that-semver -e docker)
    - echo "Docker version is $GTS_DOCKER_VERSION"
```

## Passing Variables to Downstream Jobs

The `dotenv` artifact report makes GTS variables available to all downstream jobs automatically:

```yaml
git-that-semver:
  stage: .pre
  image: ghcr.io/maff/git-that-semver:1
  script:
    - git-that-semver -e docker | tee git-that-semver.env
  artifacts:
    reports:
      dotenv: git-that-semver.env

build:
  stage: build
  script:
    - echo "Building version $GTS_DOCKER_VERSION"
    - echo "Is release: $GTS_IS_RELEASE_SEMVER_VERSION"
```

## End-to-End Example: Build and Push a Docker Image

A complete pipeline that versions, tests, and publishes a Docker image using Kaniko:

```yaml
variables:
  GIT_DEPTH: 0

stages:
  - .pre
  - test
  - docker

git-that-semver:
  stage: .pre
  image: ghcr.io/maff/git-that-semver:1
  script:
    - git-that-semver -e docker | tee git-that-semver.env
  artifacts:
    reports:
      dotenv: git-that-semver.env

test:
  stage: test
  image: node:22-alpine
  script:
    - npm ci
    - npm test

docker:
  stage: docker
  image:
    name: gcr.io/kaniko-project/executor:v1.24.0-debug
    entrypoint: [""]
  script:
    - |
      DESTINATION_FLAGS=
      for tag in $GTS_DOCKER_TAGS; do
        DESTINATION_FLAGS="$DESTINATION_FLAGS --destination ${CI_REGISTRY_IMAGE}:${tag}"
      done
    - mkdir -p /kaniko/.docker
    - >-
      echo "{\"auths\":{\"${CI_REGISTRY}\":{\"auth\":\"$(echo -n ${CI_REGISTRY_USER}:${CI_REGISTRY_PASSWORD} | base64 | tr -d '\n')\"}}}"
      > /kaniko/.docker/config.json
    - /kaniko/executor
      --context $CI_PROJECT_DIR
      --dockerfile $CI_PROJECT_DIR/Dockerfile
      $DESTINATION_FLAGS
      --cache=true
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG
```

### What This Produces

| Scenario               | `GTS_DOCKER_VERSION`                    | `GTS_DOCKER_TAGS`                    |
| ---------------------- | --------------------------------------- | ------------------------------------ |
| Push to `main`         | `1.1.0-20250315120000.abc123def456`     | version, full SHA, `main`            |
| Tag `v1.0.0` (highest) | `1.0.0`                                 | `1.0.0`, `1.0`, `1`, `latest`        |
| Tag `v1.0.1` (patch)   | `1.0.1`                                 | `1.0.1`, `1.0` (if highest in minor) |
| Tag `v2.0.0-beta.1`    | `2.0.0-beta.1`                          | `2.0.0-beta.1`                       |
| Merge request          | `1.1.0-mr-42.20250315120000.abc123def4` | version, full SHA                    |

## Reusable CI Template

To share GTS across multiple projects, create a reusable template in a central CI templates repository:

**`templates/git-that-semver.template.yml`**:

```yaml
.git-that-semver:
  image: ghcr.io/maff/git-that-semver:${GTS_VERSION}
  variables:
    GTS_VERSION: "1"
    GTS_CLI_OPTS: ""
  script:
    - git-that-semver ${GTS_CLI_OPTS} | tee git-that-semver.env
  artifacts:
    reports:
      dotenv: git-that-semver.env
```

**Consumer project `.gitlab-ci.yml`**:

```yaml
include:
  - project: "my-group/ci-templates"
    ref: "v1.0.0"
    file:
      - "/templates/git-that-semver.template.yml"

variables:
  GIT_DEPTH: 0

git-that-semver:
  extends: .git-that-semver
  stage: .pre
  variables:
    GTS_CLI_OPTS: "-e docker -e npm"
```

## Conditional Logic with Version Flags

Use GTS version flags in `rules:` to control pipeline behavior:

```yaml
deploy:
  stage: deploy
  script:
    - echo "Deploying $GTS_DOCKER_VERSION"
  rules:
    - if: $GTS_IS_RELEASE_SEMVER_VERSION == "true"

notify:
  stage: deploy
  script:
    - echo "New highest release: $GTS_DOCKER_VERSION"
  rules:
    - if: $GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION == "true"
```

## Important Notes

### Git History

GTS requires full git history to analyze tags and find previous versions. Set `GIT_DEPTH: 0` globally or on the GTS job:

```yaml
variables:
  GIT_DEPTH: 0
```

Without this, GitLab creates a shallow clone (default depth 20). While tags are fetched, GTS uses `git tag --merged` to find previous versions relative to the current commit — this requires the commit history between the current commit and previous tags to be present.

### Merge Request Pipelines

For merge request pipelines, GTS uses `CI_MERGE_REQUEST_IID` to generate a change request identifier (e.g., `mr-42`). This requires the pipeline to run with `workflow:rules` that include merge request events.
