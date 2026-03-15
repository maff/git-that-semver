# Configuration Reference

GTS uses YAML configuration files. The configuration is built up in layers:

1. **Built-in defaults** — [`src/config/git-that-semver.default.yaml`](../src/config/git-that-semver.default.yaml)
2. **User config file** — `git-that-semver.yaml` in the working directory (or specified via `-f`)
3. **CLI strategy flags** — `--enable-strategy` / `--disable-strategy`
4. **CLI overrides** — `-c path.to.key=value`

Each layer is deep-merged on top of the previous one. The resolved config is frozen (immutable) before use.

## Default Configuration

This is the full built-in default configuration:

```yaml
platform: auto

defaults:
  branchPrefixes:
    - feature/
    - fix/
    - bugfix/
    - hotfix/
    - chore/
    - tech/

  snapshot:
    defaultBranches:
      - main
    prefixTpl: |
      {{ commitInfo.previousSemVerReleaseVersion | semver_inc: 'minor' | append: '-' }}
    branchIdentifierTpl: |
      {% if config.snapshot.useChangeRequestIdentifier and commitInfo.changeRequestIdentifier %}
        {{- commitInfo.changeRequestIdentifier | append: '.' -}}
      {% elsif branchIdentifier %}
        {{- branchIdentifier | truncate: 20, '' | trim_alphanumeric | append: '.' -}}
      {% endif %}
    commitIdentifierTpl: |
      {{ commitInfo.dateTime }}.{{ commitInfo.sha | truncate: 12, '' }}
    versionTpl: |
      {{ prefix }}{{ branchIdentifier }}{{ commitIdentifier }}{{ suffix }}

strategies:
  docker:
    enabled: true
    tags:
      enabled: true
      snapshot:
        - "{{ version }}"
        - "{{ commitInfo.sha }}"
        - "{% if config.snapshot.defaultBranches contains commitInfo.refName %}{{ commitInfo.refName }}{% endif %}"
      tagged:
        - "{{ version }}"
      semVer:
        - "{{ version }}"
        - "{% if versionInfo.isHighestSameMinorReleaseVersion %}{{ semVer.major }}.{{ semVer.minor }}{% endif %}"
        - "{% if versionInfo.isHighestSameMajorReleaseVersion and semVer.major > 0 %}{{ semVer.major }}{% endif %}"
        - "{% if versionInfo.isHighestSemVerReleaseVersion %}latest{% endif %}"

  npm:
    enabled: false

  java:
    enabled: false
    snapshot:
      suffixTpl: "-SNAPSHOT"

output:
  type: env
  env:
    prefix: GTS_
```

## Configuration Schema

### Top Level

| Key          | Type                             | Default  | Description                                  |
| ------------ | -------------------------------- | -------- | -------------------------------------------- |
| `platform`   | `"auto" \| "github" \| "gitlab"` | `"auto"` | CI platform detection mode                   |
| `defaults`   | `DefaultConfig`                  | `{}`     | Default settings inherited by all strategies |
| `strategies` | `Record<string, StrategyConfig>` | `{}`     | Named version strategies (arbitrary names)   |
| `output`     | `OutputConfig`                   | `{}`     | Output format and formatting options         |

### DefaultConfig

Settings defined here are inherited by all strategies via deep merge (except `branchPrefixes`, which is only used at the top level).

| Key              | Type                     | Default | Description                                              |
| ---------------- | ------------------------ | ------- | -------------------------------------------------------- |
| `branchPrefixes` | `string[]`               | `[]`    | Prefixes stripped from branch names before slugification |
| `snapshot`       | `SnapshotConfig`         | `{}`    | Snapshot version generation settings                     |
| `tags`           | `TagsConfig`             | `{}`    | Tag generation settings                                  |
| `properties`     | `Record<string, string>` | `{}`    | Custom key-value pairs included in output                |

### SnapshotConfig

Controls how snapshot (non-release) versions are generated. All template fields use [LiquidJS syntax](templates.md).

| Key                          | Type       | Default | Description                                                      |
| ---------------------------- | ---------- | ------- | ---------------------------------------------------------------- |
| `defaultBranches`            | `string[]` | `[]`    | Branches where the branch identifier is omitted from the version |
| `useChangeRequestIdentifier` | `boolean`  | `true`  | Use PR/MR number instead of branch name in the version           |
| `prefixTpl`                  | `string`   | `""`    | Template for the version prefix (e.g. base version + `-`)        |
| `suffixTpl`                  | `string`   | `""`    | Template for the version suffix (e.g. `-SNAPSHOT`)               |
| `branchIdentifierTpl`        | `string`   | `""`    | Template for the branch/PR/MR part of the version                |
| `commitIdentifierTpl`        | `string`   | `""`    | Template for the commit part (timestamp, hash)                   |
| `versionTpl`                 | `string`   | `""`    | Template composing the final version from the parts above        |

### TagsConfig

Controls which tags are generated for each version type. Tags are primarily useful for Docker image tagging but can be used for any purpose.

| Key        | Type       | Default | Description                                       |
| ---------- | ---------- | ------- | ------------------------------------------------- |
| `enabled`  | `boolean`  | `false` | Whether to generate tags for this strategy        |
| `snapshot` | `string[]` | `[]`    | Tag templates for snapshot (untagged) builds      |
| `tagged`   | `string[]` | `[]`    | Tag templates for tagged builds (non-semver tags) |
| `semVer`   | `string[]` | `[]`    | Tag templates for semver-tagged builds            |

Each entry is a LiquidJS template. Empty results are filtered out, and duplicates are removed.

### StrategyConfig

Each strategy is an independent configuration that produces its own version string and tags. Strategies inherit from `defaults` via deep merge.

| Key          | Type                     | Default | Description                                    |
| ------------ | ------------------------ | ------- | ---------------------------------------------- |
| `enabled`    | `boolean`                | `true`  | Whether this strategy is active                |
| `snapshot`   | `SnapshotConfig`         | `{}`    | Snapshot settings (merged with defaults)       |
| `tags`       | `TagsConfig`             | `{}`    | Tag generation settings (merged with defaults) |
| `properties` | `Record<string, string>` | `{}`    | Custom key-value pairs included in output      |

### OutputConfig

| Key                         | Type                        | Default | Description                                     |
| --------------------------- | --------------------------- | ------- | ----------------------------------------------- |
| `output.type`               | `"env" \| "json" \| "yaml"` | `"env"` | Output format                                   |
| `output.env.prefix`         | `string`                    | `""`    | Prefix for environment variable names           |
| `output.env.arrayDelimiter` | `string`                    | `" "`   | Delimiter for array values (e.g. tags)          |
| `output.env.quoteArrays`    | `boolean`                   | `false` | Whether to quote array values containing spaces |
| `output.json.indent`        | `number`                    | —       | JSON indentation (omit for compact output)      |

## Strategies

### What is a strategy?

A strategy is a named configuration that produces a version string (and optionally tags) for a specific use case. The name is arbitrary — it becomes part of the output variable name.

For example, a strategy named `docker` produces `GTS_DOCKER_VERSION` and `GTS_DOCKER_TAGS` in env output, while a strategy named `python` would produce `GTS_PYTHON_VERSION`.

### Built-in strategies

GTS ships with three pre-configured strategies:

- **docker** (enabled by default) — includes tag generation for Docker image tagging
- **java** (disabled by default) — adds `-SNAPSHOT` suffix to snapshot versions
- **npm** (disabled by default) — standard semver formatting

### Custom strategies

Add any strategy by defining it in your `git-that-semver.yaml`:

```yaml
strategies:
  python:
    enabled: true
    snapshot:
      suffixTpl: ".dev0"

  helm:
    enabled: true
    tags:
      enabled: true
      semVer:
        - "{{ version }}"
        - "{% if versionInfo.isHighestSemVerReleaseVersion %}stable{% endif %}"
```

### Enabling strategies

Strategies can be enabled/disabled in three ways:

```shell
# via config file
strategies:
  npm:
    enabled: true

# via CLI flag
git-that-semver -e npm -e java

# via CLI override
git-that-semver -c strategies.npm.enabled=true
```

The `-e`/`-d` flags and config file settings are merged — `-e npm` enables npm on top of whatever the config file says.

## CLI Overrides

The `-c/--config-value` flag lets you override any config value at runtime:

```shell
git-that-semver -c path.to.key=value
```

**Value parsing rules:**

| Input            | Parsed as  |
| ---------------- | ---------- |
| `true` / `false` | Boolean    |
| `["a","b"]`      | JSON array |
| `123`            | Number     |
| Anything else    | String     |

The path uses dot notation and maps directly to the config structure. For example:

```shell
-c output.env.prefix=MY_PREFIX_
-c defaults.snapshot.defaultBranches='["main","develop"]'
-c strategies.docker.tags.enabled=false
```
