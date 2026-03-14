# git-that-semver

A CLI tool that generates semantic version numbers from your git repository state, designed for CI/CD pipelines.

## Overview

`git-that-semver`, or GTS for short, generates build version numbers based on the current state of your git repository. Its main purpose is to run in CI pipelines, producing version numbers that identify build artifacts.

GTS is **language and ecosystem agnostic**. It ships with pre-configured strategies for Docker, Java, and npm, but you can define strategies for any language or tool. Version formats are fully customizable through [LiquidJS templates](docs/templates.md).

As the name suggests, it targets versioning based on the [Semantic Versioning](https://semver.org) specification. It works best in a workflow following the principles of trunk-based development:

- [Release from Trunk](https://trunkbaseddevelopment.com/release-from-trunk/) — a release is just a commit tagged from the main branch
- [Branch for Release](https://trunkbaseddevelopment.com/branch-for-release/) — create release branches retroactively when patching older versions only

## Quick Start

### GitHub Actions

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0  # required — GTS needs full git history

  - id: gts
    uses: maff/git-that-semver/.github/actions/git-that-semver@main
    # with:
    #   env: "true"    # env var output (default)
    #   json: "false"  # JSON output
    #   yaml: "false"  # YAML output

  - run: echo "Version: ${{ steps.gts.outputs.GTS_DOCKER_VERSION }}"
```

The action outputs individual environment variables by default. Enable `json` or `yaml` for structured output via `GTS_JSON` / `GTS_YAML`.

### Docker

```shell
docker run --rm -v "$(pwd):/repo" -w /repo ghcr.io/maff/git-that-semver
```

### Standalone

```shell
# run directly with Bun
bun run index.ts

# or compile to a standalone binary
bun build ./index.ts --compile --outfile git-that-semver
./git-that-semver
```

## How It Works

GTS follows a couple of simple rules, based on the idea that releases are initiated by tagging a commit with a version number.

Multiple strategies can be configured to generate version numbers for different ecosystems — for example, a Java and a Docker build with different versioning requirements. Strategies are just named configurations; you can create as many as you need for any language or tool.

### Release versions

If the build is based on a tag, the version number will be the tag name.

If the tag is a valid SemVer version, GTS resolves additional metadata — for example, whether it is the highest version in the repository or a prerelease tag. This information can drive downstream logic (e.g. only tag Docker builds with `latest` if it is the highest release version).

### Snapshot versions

If the build is based on an untagged commit, a version number in valid SemVer format is generated from the latest tag and the current commit information.

By default, this is the next minor version based on the nearest tag, with a pre-release identifier derived from the commit hash, timestamp, and optionally branch or PR/MR information.

The format is defined by [configurable templates](docs/templates.md), so you are free to customize it to your needs.

## Examples

The following walkthrough shows GTS generating version numbers for a project using GitLab CI with three strategies: `java`, `npm`, and `docker`. In a real CI scenario, the environment variables shown below would be provided by the CI system.

### 1. Snapshot build

You start working on `main` and commit some changes. No tags exist yet.

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

The commit is not tagged, so it is a snapshot build. All SemVer flags resolve to `false`.

Since no previous release exists, the base version is `0.1.0` (next minor from `0.0.0`). The pre-release identifier contains a timestamp and short commit hash. Note the strategy-specific behavior:

- **Java**: Suffixed with `-SNAPSHOT` for publishing to snapshot repositories.
- **Docker**: Exposes a list of tags (`GTS_DOCKER_TAGS`) for tagging the image — the version, full SHA, and branch name.

### 2. Release version

You tag the commit with `v1.0.0`.

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

The version resolves as SemVer release `1.0.0`. It is the highest release in the repository, so the Docker tags include `latest` along with the major and minor versions.

### 3. Pre-release version

You want to beta-test before releasing `1.1.0`, so you tag with `v1.1.0-beta.1`.

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

GTS recognizes it as the highest SemVer version, but since it is not a release version (`GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION=false`), the Docker tags do not include `latest`.

### 4. Patch version

You need to fix a bug on the already-released `1.0.0`. You create a branch `release/1.0.x` from `v1.0.0`, fix the bug, and tag with `v1.0.1`.

```shell
$ CI=true \
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

The version is not the highest in the repository, but it is the highest within its minor version — so the Docker tags include `1.0`.

## Configuration

GTS uses YAML configuration files with the following resolution order (last wins):

1. **Built-in defaults** — `src/config/git-that-semver.default.yaml`
2. **User config** — `git-that-semver.yaml` in the working directory (or path via `-f`)
3. **CLI flags** — `--enable-strategy`, `--disable-strategy`, `--output-format`
4. **CLI overrides** — `-c path.to.key=value` for any config value

Strategies inherit their defaults from the top-level `defaults` section (deep merge). See [docs/configuration.md](docs/configuration.md) for the full configuration reference.

### Configuration overrides

You can override any configuration value from the command line using the `-c/--config-value` option:

```shell
# Override JSON output indentation
git-that-semver -o json -c output.json.indent=2

# Configure environment variable prefix
git-that-semver -c output.env.prefix=CUSTOM_

# Enable/disable strategies
git-that-semver -c strategies.npm.enabled=true

# Configure default branches (using JSON array syntax)
git-that-semver -c 'defaults.snapshot.defaultBranches=["main","develop"]'

# Disable change request identifier for snapshots
git-that-semver -c defaults.snapshot.useChangeRequestIdentifier=false

# Configure snapshot version template
git-that-semver -c 'defaults.snapshot.versionTpl={{ prefix }}-{{ commitIdentifier }}'
```

## Output Formats

| Format | Flag      | Description                                                                 |
| ------ | --------- | --------------------------------------------------------------------------- |
| `env`  | `-o env`  | Key-value pairs (`GTS_KEY=value`). Default. Arrays are space-delimited.     |
| `json` | `-o json` | Full version result as JSON. Optional indentation via `output.json.indent`. |
| `yaml` | `-o yaml` | Full version result as YAML.                                                |

## CLI Reference

| Option               | Short | Default                | Env Var             | Description                               |
| -------------------- | ----- | ---------------------- | ------------------- | ----------------------------------------- |
| `--config-file`      | `-f`  | `git-that-semver.yaml` | `GTS_CONFIG_FILE`   | Config file path                          |
| `--config-value`     | `-c`  | `[]`                   |                     | Override config values                    |
| `--log-level`        |       | `INFO`                 | `GTS_LOG_LEVEL`     | `TRACE\|DEBUG\|INFO\|WARN\|ERROR\|SILENT` |
| `--enable-strategy`  | `-e`  | `[]`                   |                     | Enable strategies by name                 |
| `--disable-strategy` | `-d`  | `[]`                   |                     | Disable strategies by name                |
| `--output-format`    | `-o`  | `env`                  | `GTS_OUTPUT_FORMAT` | `env\|json\|yaml`                         |
| `--dump-config`      |       | `false`                |                     | Dump resolved config and exit             |

Exit codes: `0` success, `2` unexpected error, `3` configuration validation error.

## Version Info Flags

Every run outputs these boolean flags, which can be used to drive downstream CI logic:

| Flag                                        | Meaning                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `GTS_IS_SNAPSHOT_VERSION`                   | Commit has no tag (snapshot build)                                             |
| `GTS_IS_TAGGED_VERSION`                     | Commit has a tag                                                               |
| `GTS_IS_SEMVER_VERSION`                     | Tag is a valid semver version                                                  |
| `GTS_IS_RELEASE_SEMVER_VERSION`             | Semver tag with no prerelease or build metadata                                |
| `GTS_IS_HIGHEST_SEMVER_VERSION`             | Highest semver tag in the entire repo                                          |
| `GTS_IS_HIGHEST_SEMVER_RELEASE_VERSION`     | Highest release (non-prerelease) tag in the repo                               |
| `GTS_IS_HIGHEST_SAME_MAJOR_RELEASE_VERSION` | This is a release tag and the highest semver tag within the same major version |
| `GTS_IS_HIGHEST_SAME_MINOR_RELEASE_VERSION` | This is a release tag and the highest semver tag within the same major.minor   |

## Further Reading

- [Configuration Reference](docs/configuration.md) — full config schema, strategy system, defaults
- [Template Customization](docs/templates.md) — template variables, filters, and examples
- [CI Platform Integration](docs/platforms.md) — GitHub Actions and GitLab CI details
- [AI Agent Instructions](AGENTS.md) — for AI coding tools (Claude Code, Cursor, Copilot, etc.)

## License

[MIT](LICENSE)
