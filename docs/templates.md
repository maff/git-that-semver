# Template Customization

GTS uses [LiquidJS](https://liquidjs.com/) templates to generate version strings and tags. Templates are defined in the YAML configuration and can be customized per strategy.

## How the Template Chain Works

Snapshot versions are built from a chain of templates, each producing a part of the final version string:

```
prefixTpl          →  "0.2.0-"
branchIdentifierTpl →  "my-feature."
commitIdentifierTpl →  "20240712221812.d382a736cbc1"
suffixTpl          →  ""
                      ─────────────────────────────
versionTpl         →  "0.2.0-my-feature.20240712221812.d382a736cbc1"
```

The default `versionTpl` composes these parts:

```liquid
{{ prefix }}{{ branchIdentifier }}{{ commitIdentifier }}{{ suffix }}
```

You can override individual parts or replace the entire `versionTpl` for full control.

## Template Context Variables

All templates have access to these variables:

### `commitInfo` — Git commit data

| Variable                                  | Type     | Description                                                    |
| ----------------------------------------- | -------- | -------------------------------------------------------------- |
| `commitInfo.sha`                          | `string` | Full commit SHA                                                |
| `commitInfo.refName`                      | `string` | Branch or tag name as reported by the CI platform              |
| `commitInfo.refNameSlug`                  | `string` | Slugified ref name with configured prefixes stripped           |
| `commitInfo.changeRequestIdentifier`      | `string` | `pr-123` (GitHub) or `mr-456` (GitLab), if applicable          |
| `commitInfo.tag`                          | `string` | Git tag, if the commit is tagged                               |
| `commitInfo.dateTime`                     | `string` | Commit timestamp in `YYYYMMDDHHMMSS` format                    |
| `commitInfo.previousSemVerVersion`        | `string` | Highest semver tag merged before this commit                   |
| `commitInfo.previousSemVerReleaseVersion` | `string` | Highest release (non-prerelease) semver tag before this commit |

### `versionInfo` — Version classification flags

| Variable                                       | Type      | Description                                                        |
| ---------------------------------------------- | --------- | ------------------------------------------------------------------ |
| `versionInfo.isSnapshotVersion`                | `boolean` | Commit has no tag                                                  |
| `versionInfo.isTaggedVersion`                  | `boolean` | Commit has a tag (any)                                             |
| `versionInfo.isSemVerVersion`                  | `boolean` | Tag is a valid semver version                                      |
| `versionInfo.isReleaseSemVerVersion`           | `boolean` | Semver tag with no prerelease or build metadata                    |
| `versionInfo.isHighestSemVerVersion`           | `boolean` | Highest semver tag in the entire repository                        |
| `versionInfo.isHighestSemVerReleaseVersion`    | `boolean` | Highest release tag in the repository                              |
| `versionInfo.isHighestSameMajorReleaseVersion` | `boolean` | Highest release (non-prerelease) tag within the same major version |
| `versionInfo.isHighestSameMinorReleaseVersion` | `boolean` | Highest release (non-prerelease) tag within the same major.minor   |

### `config` — Current strategy configuration

The full strategy config object. Useful for accessing strategy-specific settings in templates:

```liquid
{% if config.snapshot.defaultBranches contains commitInfo.refName %}
  {{ commitInfo.refName }}
{% endif %}
```

### `env` — Environment variables

All environment variables from `process.env`. Access any CI or custom variable:

```liquid
{{ env.BUILD_NUMBER }}
{{ env.CI_PIPELINE_ID }}
```

### Additional variables (context-dependent)

| Variable            | Available in                        | Description                                                                                                                                                |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`           | Tag templates (`tagged`, `semVer`)  | The rendered version string                                                                                                                                |
| `semVer`            | `semVer` tag templates only         | Parsed SemVer object                                                                                                                                       |
| `semVer.major`      | `semVer` tag templates only         | Major version number                                                                                                                                       |
| `semVer.minor`      | `semVer` tag templates only         | Minor version number                                                                                                                                       |
| `semVer.patch`      | `semVer` tag templates only         | Patch version number                                                                                                                                       |
| `semVer.prerelease` | `semVer` tag templates only         | Prerelease identifiers (array)                                                                                                                             |
| `prefix`            | `versionTpl`                        | Rendered prefix from `prefixTpl`                                                                                                                           |
| `suffix`            | `versionTpl`                        | Rendered suffix from `suffixTpl`                                                                                                                           |
| `branchIdentifier`  | `versionTpl`, `branchIdentifierTpl` | In `branchIdentifierTpl`: the raw slugified ref name (or `undefined` for default branches). In `versionTpl`: the rendered output of `branchIdentifierTpl`. |
| `commitIdentifier`  | `versionTpl`                        | Rendered commit identifier                                                                                                                                 |

## Custom Filters

In addition to all [built-in LiquidJS filters](https://liquidjs.com/filters/overview.html), GTS provides:

### `trim_alphanumeric`

Removes non-alphanumeric characters from the start and end of a string.

```liquid
{{ "-my-branch-" | trim_alphanumeric }}
→ "my-branch"
```

### `semver_inc`

Increments a semver version string. Accepts: `major`, `minor`, `patch`.

```liquid
{{ "1.2.3" | semver_inc: 'minor' }}
→ "1.3.0"

{{ "0.0.0" | semver_inc: 'minor' }}
→ "0.1.0"
```

Note: `prerelease` is also accepted (delegates to the `semver` library) but behaves unexpectedly on non-prerelease versions — e.g. `"1.0.0" | semver_inc: 'prerelease'` produces `"1.0.1-0"`. Prefer `major`, `minor`, or `patch`.

## Examples

### Custom snapshot format with build number

```yaml
defaults:
  snapshot:
    prefixTpl: "{{ commitInfo.previousSemVerReleaseVersion | semver_inc: 'minor' }}"
    commitIdentifierTpl: "build.{{ env.BUILD_NUMBER }}"
    versionTpl: "{{ prefix }}-{{ commitIdentifier }}"
    # Result: 1.3.0-build.42
```

### Append suffix for Java snapshots

```yaml
strategies:
  java:
    enabled: true
    snapshot:
      suffixTpl: "-SNAPSHOT"
      # Result: 0.2.0-20240712221812.d382a736cbc1-SNAPSHOT
```

### Docker tags with conditional `latest`

```yaml
strategies:
  docker:
    enabled: true
    tags:
      enabled: true
      semVer:
        - "{{ version }}"
        - "{% if versionInfo.isHighestSameMinorReleaseVersion %}{{ semVer.major }}.{{ semVer.minor }}{% endif %}"
        - "{% if versionInfo.isHighestSemVerReleaseVersion %}latest{% endif %}"
      # For v1.2.3 (highest release): ["1.2.3", "1.2", "latest"]
      # For v1.2.3 (not highest):     ["1.2.3", "1.2"]
```

### Use PR/MR number in snapshot version

This is the default behavior when `useChangeRequestIdentifier` is `true`. The branch identifier template checks for a change request identifier first:

```liquid
{% if config.snapshot.useChangeRequestIdentifier and commitInfo.changeRequestIdentifier %}
  {{- commitInfo.changeRequestIdentifier | append: '.' -}}
{% elsif branchIdentifier %}
  {{- branchIdentifier | truncate: 20, '' | trim_alphanumeric | append: '.' -}}
{% endif %}
```

Result on a PR: `0.2.0-pr-42.20240712221812.d382a736cbc1`
Result on a branch: `0.2.0-my-feature.20240712221812.d382a736cbc1`

### Skip branch identifier entirely

```yaml
defaults:
  snapshot:
    branchIdentifierTpl: ""
    # Result: 0.2.0-20240712221812.d382a736cbc1
```

### Custom strategy for Helm charts

```yaml
strategies:
  helm:
    enabled: true
    tags:
      enabled: true
      semVer:
        - "{{ version }}"
        - "{% if versionInfo.isHighestSemVerReleaseVersion %}stable{% endif %}"
    properties:
      chartName: my-app
```
