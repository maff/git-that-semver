# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `bun test` - Run all tests (unit + e2e)
- `bun test <pattern>` - Run specific test files (e.g., `bun test util` for util tests)
- `bun test test/e2e/` - Run end-to-end tests only
- `bun test --test-name-pattern <pattern>` - Run tests matching pattern
- `bun run lint` - Check code formatting with Prettier
- `bun run lint-fix` - Fix code formatting issues

### Building

- `bun run index.ts` - Run the CLI tool directly
- `bun run index.ts --help` - Show CLI help

## Architecture

git-that-semver (GTS) is a CLI tool that generates semantic version numbers based on git repository state, designed for CI/CD pipelines. It is written in TypeScript using Bun as the runtime and package manager.

### Core Components

**Main Entry Point**: `index.ts` - Commander.js CLI setup with option parsing and error handling

**Configuration System** (`src/config/`):

- Default config from `git-that-semver.default.yaml`
- User overrides from `git-that-semver.yaml`
- Runtime overrides via CLI flags
- Zod schema validation in `types.ts`

**Platform Integration** (`src/platform/`):

- Detects CI environment (GitHub Actions, GitLab CI)
- Extracts git metadata from CI environment variables
- Platform-specific logic for branch/PR/MR detection

**Version Resolution** (`src/version/`):

- `versionResolver.ts` - Main version calculation logic
- `versionStrategy.ts` - Per-strategy (java, npm, docker) version formatting
- Supports release versions (from tags) and snapshot versions (from commits)

**Output System** (`src/output/`):

- Multiple output formats: env vars, JSON, YAML
- Template engine for customizable version strings
- Environment variable prefixing and formatting

**Utilities** (`src/util/`):

- Git operations and tag analysis
- Semantic version parsing and comparison
- Process execution helpers

### Key Concepts

**Versioning Logic**:

- Release versions: exact tag names when on tagged commits
- Snapshot versions: generated from latest tag + commit info + branch metadata
- Multiple strategies allow different version formats for different ecosystems

**Template System** (`src/tpl/`):

- Uses LiquidJS for version string templating
- Configurable templates per strategy and version type
- Variables include commit info, branch names, timestamps

**Configuration Merging**:

- Defaults merged with user config
- Strategy-specific configs inherit from defaults
- CLI overrides applied last

## Testing

**Unit Tests**: Located alongside source files with `.test.ts` suffix

- Test individual functions and components in isolation
- Mock external dependencies when needed

**End-to-End Tests** (`test/e2e/`):

- Test complete CLI workflows using real git repository state
- Cover all README scenarios: snapshot, release, pre-release, patch versions
- Test platform detection (GitHub Actions, GitLab CI)
- Test output formats (env, JSON, YAML) and configuration overrides
