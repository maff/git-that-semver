# CI Platform Integration

GTS detects the CI platform automatically and extracts git metadata from the platform's environment variables.

## Platform Detection

By default (`platform: auto`), GTS tries each supported platform in order and uses the first one that matches. You can also set the platform explicitly in the config:

```yaml
platform: github # or: gitlab, auto
```

If no platform matches and `auto` is set, GTS exits with an error.

## GitHub Actions

### Detection

GTS recognizes GitHub Actions when both `CI=true` and `GITHUB_ACTIONS=true` are set.

### Environment Variables

| GTS needs         | GitHub variable     | Notes                                                                                                            |
| ----------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Commit SHA        | `GITHUB_SHA`        | Full 40-character SHA                                                                                            |
| Event type        | `GITHUB_EVENT_NAME` | Required. Discriminates PR vs push events.                                                                       |
| Ref name          | `GITHUB_HEAD_REF`   | Used when `GITHUB_EVENT_NAME` is `pull_request`                                                                  |
|                   | `GITHUB_REF_NAME`   | Used for all other events (branch or tag name)                                                                   |
| Git tag           | `GITHUB_REF_NAME`   | Only when `GITHUB_REF_TYPE` is `tag`                                                                             |
| Change request ID | `GITHUB_REF`        | Only when `GITHUB_EVENT_NAME` is `pull_request`. Extracted via regex: `refs/pull/{number}/merge` → `pr-{number}` |

### Usage as a GitHub Action

The repository includes a reusable GitHub Action:

```yaml
jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # GTS needs full history for tag analysis

      - id: gts
        uses: maff/git-that-semver/.github/actions/git-that-semver@main
        with:
          env: "true" # Output individual env vars (default)
          json: "false" # Output JSON to GTS_JSON
          yaml: "false" # Output YAML to GTS_YAML

      - run: |
          echo "Version: ${{ steps.gts.outputs.GTS_DOCKER_VERSION }}"
          echo "Is release: ${{ steps.gts.outputs.GTS_IS_RELEASE_SEMVER_VERSION }}"
```

#### Action Inputs

| Input  | Default   | Description                              |
| ------ | --------- | ---------------------------------------- |
| `env`  | `"true"`  | Output individual environment variables  |
| `json` | `"false"` | Output full result as JSON in `GTS_JSON` |
| `yaml` | `"false"` | Output full result as YAML in `GTS_YAML` |

When `env` is enabled, each version info flag and strategy result is available as an individual step output (`steps.gts.outputs.GTS_*`).

When `json` or `yaml` is enabled, the full structured result is available as `GTS_JSON` or `GTS_YAML` respectively.

The action also writes results to the GitHub Actions job summary for easy visibility.

#### Important: `fetch-depth: 0`

GTS requires full git history to analyze tags. Without `fetch-depth: 0`, the checkout action creates a shallow clone and GTS cannot determine previous versions or compute version info flags correctly.

## GitLab CI

### Detection

GTS recognizes GitLab CI when both `CI=true` and `GITLAB_CI=true` are set.

### Environment Variables

| GTS needs         | GitLab variable        | Notes                                            |
| ----------------- | ---------------------- | ------------------------------------------------ |
| Commit SHA        | `CI_COMMIT_SHA`        | Full 40-character SHA                            |
| Ref name          | `CI_COMMIT_REF_NAME`   | Branch or tag name                               |
| Git tag           | `CI_COMMIT_TAG`        | Set only on tag pipelines (empty otherwise)      |
| Change request ID | `CI_MERGE_REQUEST_IID` | MR number → `mr-{number}`. Only in MR pipelines. |

### Usage in GitLab CI

```yaml
version:
  image: ghcr.io/maff/git-that-semver
  script:
    - git-that-semver -e docker -e npm
```

Or use the Docker image directly:

```yaml
version:
  stage: version
  image: ghcr.io/maff/git-that-semver
  script:
    - eval $(git-that-semver -e docker)
    - echo "Docker version is $GTS_DOCKER_VERSION"
```

#### Important: Git history

Ensure your GitLab CI runner fetches full history. In `.gitlab-ci.yml`:

```yaml
variables:
  GIT_DEPTH: 0 # or GIT_STRATEGY: clone
```

## Adding Platform Support

Platform adapters are defined in `src/platform/`. Each adapter implements the `Platform` interface:

```typescript
interface Platform {
  type: string;
  isSupported(): boolean;
  getCommitSha(): string;
  getCommitRefName(): string;
  getGitTag(): string | undefined;
  getChangeRequestIdentifier(): string | undefined;
}
```

New adapters are registered in `src/platform/index.ts`. See [#50](https://github.com/maff/git-that-semver/issues/50) for discussion on making adapters pluggable.
