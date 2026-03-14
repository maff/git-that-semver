# AGENTS.md

Instructions for AI coding agents working on this repository.

## Project

**git-that-semver (GTS)** is a CLI tool that generates semantic version numbers from git repository state, designed for CI/CD pipelines. Written in TypeScript, runs on Bun. Supports arbitrary versioning strategies via configuration — three are pre-included (docker, java, npm) but any language or ecosystem can be added by defining a new strategy in the config file. Version formats are fully customizable through LiquidJS templates. Distributed as a Docker image and GitHub Action.

## Commands

| Task               | Command                                     |
| ------------------ | ------------------------------------------- |
| Run all tests      | `bun test`                                  |
| Run specific tests | `bun test <pattern>` (e.g. `bun test util`) |
| Run e2e tests only | `bun test test/e2e/`                        |
| Run by test name   | `bun test --test-name-pattern <pattern>`    |
| Check formatting   | `bun run lint`                              |
| Fix formatting     | `bun run lint-fix`                          |
| Run CLI directly   | `bun run index.ts`                          |
| Show CLI help      | `bun run index.ts --help`                   |

## Architecture

```
index.ts                          CLI entry point (Commander.js)
  |
  resolveConfig()                 src/config/index.ts
  |  reads: git-that-semver.default.yaml + git-that-semver.yaml + CLI overrides
  |  validates: Zod schemas in src/config/types.ts
  |
  resolvePlatform()               src/platform/index.ts
  |  auto-detects: GitHub Actions or GitLab CI from env vars
  |
  resolveVersion()                src/version/versionResolver.ts
  |  tagged commit? -> use tag as version, compute semver flags
  |  untagged?      -> generate snapshot version from templates
  |  delegates to:    src/version/versionStrategy.ts (per-strategy formatting)
  |
  resolveOutputPrinter()          src/output/index.ts
     formats: env vars | JSON | YAML
```

## Key Files

| Path                                      | Responsibility                                                      |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `index.ts`                                | CLI setup, option parsing, error handling, orchestration            |
| `src/config/index.ts`                     | Config loading, merging (defaults < file < CLI), strategy filtering |
| `src/config/types.ts`                     | Zod schemas for all config types                                    |
| `src/config/overrides.ts`                 | Parses `-c path.to.key=value` CLI overrides                         |
| `src/config/git-that-semver.default.yaml` | Default configuration with all templates                            |
| `src/version/versionResolver.ts`          | Core version logic, version info flags, commit info assembly        |
| `src/version/versionStrategy.ts`          | Per-strategy version/tag rendering via templates                    |
| `src/platform/index.ts`                   | Platform interface, auto-detection registry                         |
| `src/platform/github.ts`                  | GitHub Actions env var mapping                                      |
| `src/platform/gitlab.ts`                  | GitLab CI env var mapping                                           |
| `src/tpl/templateEngine.ts`               | LiquidJS engine with custom filters                                 |
| `src/output/env.ts`                       | Environment variable output formatter                               |
| `src/output/json.ts`                      | JSON output formatter                                               |
| `src/output/yaml.ts`                      | YAML output formatter                                               |
| `src/logging/index.ts`                    | Logger with levels, child loggers, stderr output                    |
| `src/util/git.ts`                         | Git operations (list tags, commit datetime)                         |
| `src/util/semVer.ts`                      | SemVer string formatting helper                                     |
| `src/util/process.ts`                     | `Bun.spawnSync` wrapper                                             |
| `src/util/env.ts`                         | Environment variable access helpers                                 |

## CLI Options

| Option               | Short | Default                | Env Var             | Description                                  |
| -------------------- | ----- | ---------------------- | ------------------- | -------------------------------------------- |
| `--config-file`      | `-f`  | `git-that-semver.yaml` | `GTS_CONFIG_FILE`   | Config file path                             |
| `--config-value`     | `-c`  | `[]`                   |                     | Override config values (`path.to.key=value`) |
| `--log-level`        |       | `INFO`                 | `GTS_LOG_LEVEL`     | `TRACE\|DEBUG\|INFO\|WARN\|ERROR\|SILENT`    |
| `--enable-strategy`  | `-e`  | `[]`                   |                     | Enable strategies by name                    |
| `--disable-strategy` | `-d`  | `[]`                   |                     | Disable strategies by name                   |
| `--output-format`    | `-o`  | `env`                  | `GTS_OUTPUT_FORMAT` | `env\|json\|yaml`                            |
| `--dump-config`      |       | `false`                |                     | Dump resolved config and exit                |

Exit codes: `0` success, `2` unexpected error, `3` Zod validation error.

## Configuration System

**Resolution order** (last wins): default YAML < user `git-that-semver.yaml` < CLI `--enable/disable-strategy` < CLI `-c` overrides.

Strategy configs inherit from `defaults` (deep merge, except `branchPrefixes`). The resolved config is frozen.

**Strategies are arbitrary**: The three built-in strategies (docker, java, npm) are just pre-configured defaults. Any strategy name can be defined in the config file — each gets its own version string, tags, and properties. This makes GTS language/ecosystem-agnostic.

**Override syntax** (`-c` flag): `path.to.key=value`. Values are auto-parsed as booleans (`true`/`false`), JSON arrays (`["a","b"]`), numbers, or strings. Uses lodash `set()`.

**Config schema** (see `src/config/types.ts` for full Zod definitions):

```
Config
  platform: "auto" | "github" | "gitlab"
  defaults: DefaultConfig
    branchPrefixes: string[]           # stripped from branch names (e.g. "feature/")
    snapshot: SnapshotConfig
      defaultBranches: string[]        # branches where branch identifier is omitted
      useChangeRequestIdentifier: bool # use PR/MR number instead of branch name
      prefixTpl: string               # LiquidJS template for version prefix
      suffixTpl: string               # LiquidJS template for version suffix
      branchIdentifierTpl: string      # LiquidJS template for branch part
      commitIdentifierTpl: string      # LiquidJS template for commit part
      versionTpl: string              # LiquidJS template composing final version
    tags: TagsConfig
      enabled: bool
      snapshot: string[]               # tag templates for snapshot builds
      tagged: string[]                 # tag templates for non-semver tagged builds
      semVer: string[]                 # tag templates for semver tagged builds
    properties: Record<string, string> # custom key-value pairs passed to output
  strategies: Record<string, StrategyConfig>  # same shape as defaults (minus branchPrefixes)
  output: OutputConfig
    type: "env" | "json" | "yaml"
    env: { prefix, arrayDelimiter, quoteArrays }
    json: { indent? }
```

## Version Resolution Logic

**Decision flow** in `versionResolver.ts`:

1. Fetch commit info from platform (SHA, ref name, tag, change request ID)
2. Find previous semver tags merged into this commit (`git tag --merged`)
3. If **tagged**:
   - Parse tag as semver. If invalid: `isTaggedVersion=true`, all semver flags `false`
   - If valid semver: compute all version info flags by comparing against all repo tags
4. If **untagged** (snapshot):
   - All version info flags `false` except `isSnapshotVersion=true`
   - Generate version from template chain: `prefixTpl` -> `branchIdentifierTpl` -> `commitIdentifierTpl` -> `versionTpl`

**Version info flags** (all booleans, all available in templates):

| Flag                               | Meaning                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `isSnapshotVersion`                | Commit has no tag                                              |
| `isTaggedVersion`                  | Commit has a tag (any)                                         |
| `isSemVerVersion`                  | Tag is valid semver                                            |
| `isReleaseSemVerVersion`           | Semver tag with no prerelease/build metadata                   |
| `isHighestSemVerVersion`           | Highest semver tag in entire repo                              |
| `isHighestSemVerReleaseVersion`    | Highest release (non-prerelease) tag in repo                   |
| `isHighestSameMajorReleaseVersion` | Highest release (non-prerelease) tag within same major version |
| `isHighestSameMinorReleaseVersion` | Highest release (non-prerelease) tag within same major.minor   |

**Snapshot base version**: When no previous release exists, defaults to `0.0.0`. The default `prefixTpl` bumps the minor: `0.0.0` -> `0.1.0-`.

## Template System

Uses LiquidJS. Templates are defined in config YAML (both defaults and per-strategy).

**Template context variables:**

| Variable                                  | Available in                        | Type                                                               |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `config`                                  | All templates                       | Current strategy config                                            |
| `commitInfo.sha`                          | All                                 | Full commit SHA                                                    |
| `commitInfo.refName`                      | All                                 | Branch/tag name                                                    |
| `commitInfo.refNameSlug`                  | All                                 | Slugified, prefix-stripped ref name                                |
| `commitInfo.changeRequestIdentifier`      | All                                 | `pr-{N}` or `mr-{N}` (if applicable)                               |
| `commitInfo.tag`                          | All                                 | Git tag (if tagged)                                                |
| `commitInfo.dateTime`                     | All                                 | `YYYYMMDDHHMMSS` format                                            |
| `commitInfo.previousSemVerVersion`        | All                                 | Latest semver tag before this commit                               |
| `commitInfo.previousSemVerReleaseVersion` | All                                 | Latest release semver tag before this commit                       |
| `versionInfo.*`                           | All                                 | All version info flags (see table above)                           |
| `env`                                     | All                                 | `process.env` (all environment variables)                          |
| `version`                                 | Tag templates                       | Rendered version string                                            |
| `semVer`                                  | semVer tag templates                | Parsed SemVer object (`.major`, `.minor`, `.patch`, `.prerelease`) |
| `prefix`                                  | `versionTpl`                        | Rendered prefix                                                    |
| `suffix`                                  | `versionTpl`                        | Rendered suffix                                                    |
| `branchIdentifier`                        | `versionTpl`, `branchIdentifierTpl` | Rendered branch ID (or slug)                                       |
| `commitIdentifier`                        | `versionTpl`                        | Rendered commit ID                                                 |

**Custom LiquidJS filters:**

| Filter              | Usage                                  | Example                                       |
| ------------------- | -------------------------------------- | --------------------------------------------- |
| `trim_alphanumeric` | Remove non-alphanumeric from start/end | `"-abc-" \| trim_alphanumeric` -> `"abc"`     |
| `semver_inc`        | Increment semver component             | `"1.0.0" \| semver_inc: 'minor'` -> `"1.1.0"` |

## Platform Integration

**Auto-detection** (`platform: auto`): tries GitHub, then GitLab; throws if neither matches.

| Platform       | Detection                         | SHA             | Ref Name                                                             | Tag                                        | Change Request                                                     |
| -------------- | --------------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| GitHub Actions | `CI=true` + `GITHUB_ACTIONS=true` | `GITHUB_SHA`    | `GITHUB_HEAD_REF` (PR, via `GITHUB_EVENT_NAME`) or `GITHUB_REF_NAME` | `GITHUB_REF_NAME` if `GITHUB_REF_TYPE=tag` | `pr-{N}` from `GITHUB_REF` (when `GITHUB_EVENT_NAME=pull_request`) |
| GitLab CI      | `CI=true` + `GITLAB_CI=true`      | `CI_COMMIT_SHA` | `CI_COMMIT_REF_NAME`                                                 | `CI_COMMIT_TAG`                            | `mr-{N}` from `CI_MERGE_REQUEST_IID`                               |

## Output Formats

- **env** (default): `{PREFIX}{KEY}=value` pairs. Arrays space-delimited. Booleans as `"true"`/`"false"`. Empty tag arrays omitted. Prefix default: `GTS_`.
- **json**: Full `VersionResult` object. Optional `indent` config.
- **yaml**: Same data as JSON, YAML-serialized.

## Testing

**Unit tests**: Co-located with source (`src/**/*.test.ts`). Test individual functions, mock external deps.

**E2E tests** (`test/e2e/git-that-semver.e2e.test.ts`): Invoke actual CLI via `bun run index.ts`. Use a clean environment (strip CI vars, keep `PATH`/`HOME`/`SHELL`). Set CI env vars to simulate GitLab/GitHub. Use fixed commit SHA for deterministic output.

**Test fixtures**: `src/output/__fixtures__/versionResults.ts` provides reusable version result objects.

**Test config override file**: `test/git-that-semver.overrides.yaml` demonstrates multi-strategy with custom prefix.

## Conventions

- **Runtime**: Bun. Prefer Bun APIs over Node.js equivalents.
- **Tests**: Bun test runner. Co-locate unit tests as `*.test.ts` next to source.
- **Formatting**: Prettier with `@trivago/prettier-plugin-sort-imports`. Enforced by husky pre-commit hook.
- **Logging**: All log output to stderr (stdout reserved for version output). Use `logger.childLogger("component-name")` for prefixed logging.
- **Config defaults**: Use Zod `.default()` and `.prefault({})` for nested object defaults.
- **Immutability**: Resolved config is frozen via `Object.freeze`.
- **Error handling**: Zod errors exit 3 with formatted messages. Other errors exit 2.

## Distribution

- **Docker**: Multi-stage build (`oven/bun:1-alpine`). Compiles to standalone binary via `bun build --compile`. Published to `ghcr.io`.
- **GitHub Action**: `.github/actions/git-that-semver/action.yml`. Runs Docker image. Outputs env vars + optional JSON/YAML to `$GITHUB_OUTPUT` and `$GITHUB_STEP_SUMMARY`.
- **Standalone binary**: `bun build ./index.ts --compile --outfile git-that-semver`.
- **Direct**: `bun run index.ts [args]`.
