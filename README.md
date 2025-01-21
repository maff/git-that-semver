# git-that-semver

A command line tool that generates build version numbers based on your git repository state, primarily designed for CI pipelines.

## Overview

`git-that-semver`, or GTS for short, is a command line tool that helps you to generate a build version number based on the current state of your git repository. Its main purpose is to be used in CI pipelines to generate a version number that can be used to identify the build artifacts.

As you can guess from the name, it is targeted to versioning based on the [Semantic Versioning](https://semver.org) specification. It works best with in a workflow following the principles of trunk-based development:

- [Release from Trunk](https://trunkbaseddevelopment.com/release-from-trunk/) (a release is just a commit tagged from the main branch)
- [Branch for Release](https://trunkbaseddevelopment.com/branch-for-release/) (create release branches retroactively when patching older versions only)

## Versioning logic

GTS follows a couple of simple rules, based on the idea that releases are initiated by tagging a commit with a version number.

Multiple strategies can be configured to generate version numbers for different ecosystems/programming languages (e.g. a Java and a Docker build with different versioning requirements).

### Release versions

If the build is based on a tag, the used version number will be the tag name.

If the tag is a valid SemVer version, GTS will resolve additional data, for example, if it is the highest SemVer version in the repository, or if it is a prerelease tag. This additional information can be used to derive additional logic from the version number (e.g. only tag Docker builds with `latest` if it is the highest version number available and not a prerelease tag).

### Snapshot versions (non-release versions)

If the build is based on a commit that is not tagged, a version number in valid SemVer format will be generated based on the latest tag and the current commit information.

By default, this is the next minor number based on the nearest tag including a pre-release identifier which is derived from the current commit information (hash/date/time) plus optionally branch or PR/MR information.

As the format is defined by a set of configurable templates you are free to configure this to your needs.

## Examples

Let's assume you start working on a repository `awesome-project` and set up GTS to generate version numbers in your CI pipeline.

GTS currently has built-in support for GitLab CI and GitHub Actions - let's assume you are using GitLab CI here. In a CI scenario, the environment variables we set below would be provided by the CI system.

As our project contains a Java and an NPM application and builds a Docker image, we instruct GTS to use the `java`, `npm` and `docker` strategies. The examples below use the `env` exporter, but you can also use `json` or `yaml` to export the data in different formats.

### 1. Snapshot build

Let's assume you start working on `main` and commit some changes. GTS is running on your pipeline and generating version information which you can use in your actual build logic (e.g. when tagging a docker image).

```shell
$ CI=true \
GITLAB_CI=true \
CI_COMMIT_REF_NAME=main \
CI_COMMIT_SHA=d382a736cbc13965792a331af59144f357e5669e \
git-that-semver -e java -e npm -e docker

[INFO] (platform) Resolved platform: gitlab
GTS_IS_SNAPSHOT_VERSION=true
GTS_IS_TAGGED_VERSION=false
GTS_IS_SEMVER_VERSION=false
GTS_IS_RELEASE_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
GTS_JAVA_VERSION=0.1.0-20240712221812.d382a736cbc1-SNAPSHOT
GTS_NPM_VERSION=0.1.0-20240712221812.d382a736cbc1
GTS_DOCKER_VERSION=0.1.0-20240712221812.d382a736cbc1
GTS_DOCKER_TAGS=0.1.0-20240712221812.d382a736cbc1 d382a736cbc13965792a331af59144f357e5669e main
```

As the commit is not tagged, it is considered a snapshot build and all SemVer related variables (e.g. `GTS_IS_HIGHEST_SEMVER_VERSION`) are resolved to false.

As no previous release exists, the base version for the pre-release is `0.1.0` (the next minor starting from `0.0.0`). In the default config, the pre-release version contains a timestamp and a short commit hash. In addition, you can see that the default configuration defines special semantics for certain strategies, such as:

- The Java snapshot version is suffixed in `-SNAPSHOT` in order to push snapshot versions to a dedicated repository.
- The Docker strategy, in addition to the version number, exposes a list of tags which can be used to tag the Docker image. How these tags are generated is configurable and you are free to override the defaults to your needs.

### 2. Release version

You're happy with your changes and decide to tag a first version. You tag the commit with `v1.0.0`.

```shell
$ CI=true \
GITLAB_CI=true \
CI_COMMIT_REF_NAME=main \
CI_COMMIT_SHA=d382a736cbc13965792a331af59144f357e5669e \
CI_COMMIT_TAG=v1.0.0 \
git-that-semver -e java -e npm -e docker

[INFO] (platform) Resolved platform: gitlab
GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=true
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=true
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true
GTS_JAVA_VERSION=1.0.0
GTS_NPM_VERSION=1.0.0
GTS_DOCKER_VERSION=1.0.0
GTS_DOCKER_TAGS=1.0.0 1.0 1 latest
```

In this case, the version is resolved as SemVer release version `1.0.0`. It is the highest release version in the repository and it is a release version (not a pre-release). As it is the highest version in the repository, the Docker tags include `latest` along with the major and minor versions.

### 3. Pre-release version

You add some more changes which you are planning to release as `1.1.0`, but you'd like to create a beta release first. You tag the commit with `v1.1.0-beta.1`.

```shell
$ CI=true \
GITLAB_CI=true \
CI_COMMIT_REF_NAME=main \
CI_COMMIT_SHA=41dad5b09561e15501dac4aa109767314c5705b4 \
CI_COMMIT_TAG=v1.1.0-beta.1 \

git-that-semver -e java -e npm -e docker
[INFO] (platform) Resolved platform: gitlab
GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=false
GTS_JAVA_VERSION=1.1.0-beta.1
GTS_NPM_VERSION=1.1.0-beta.1
GTS_DOCKER_VERSION=1.1.0-beta.1
GTS_DOCKER_TAGS=1.1.0-beta.1
```

GTS resolves it as SemVer pre-release version and recognizes it as highest SemVer version in the repository, but as it is not a release version (`GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION` is false), the Docker tags do not include `latest`. Again, this logic can be customized to your needs.

After your release was tested, you go ahead and tag `v1.1.0`.

### 4. Patch version

While working on your changes for `1.1.0`, you realize you need to fix a bug on the already-released `1.0.0` version. You create a new branch `release/1.0.x` of `v1.0.0`, fix the bug and tag the bugfix commit with `v1.0.1`.

```shell
CI=true \
GITLAB_CI=true \
CI_COMMIT_REF_NAME=release/1.0.x \
CI_COMMIT_SHA=954a4111a94b844d758c7ef5c8a9806b53a7935b \
CI_COMMIT_TAG=v1.0.1 \
git-that-semver -e java -e npm -e docker

[INFO] (platform) Resolved platform: gitlab
GTS_IS_SNAPSHOT_VERSION=false
GTS_IS_TAGGED_VERSION=true
GTS_IS_SEMVER_VERSION=true
GTS_IS_RELEASE_SEMVER_VERSION=true
GTS_IS_HIGHEST_SEMVER_VERSION=false
GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION=false
GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION=true
GTS_JAVA_VERSION=1.0.1
GTS_NPM_VERSION=1.0.1
GTS_DOCKER_VERSION=1.0.1
GTS_DOCKER_TAGS=1.0.1 1.0
```

As you can see, the resolved version is not the highest in the repository, but as it is the highest within its minor version the Docker tags include `1.0` as well.

## TODOs

- dynamic loading of SCM adapters?
- logging to STDERR colorizes to the output to red by default - this is overridden and works as long as the output is not redirected, but results in red output otherwise - any way to fix this?
