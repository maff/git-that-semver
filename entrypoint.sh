#!/bin/sh

set -eu

git config --global --add safe.directory "$PWD"

git-that-semver "$@"
