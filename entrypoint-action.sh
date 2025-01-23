#!/bin/sh

set -eu

sh -c "git config --global --add safe.directory $PWD"

json_result=$(git-that-semver "$@" -o json)

echo "gts_json_result=$json_result" | tee -a $GITHUB_OUTPUT