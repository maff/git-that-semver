#!/bin/sh

set -eu

sh -c "git config --global --add safe.directory $PWD"

result=$(git-that-semver "$@")
json_result=$(git-that-semver "$@" -o json)

# write to output
echo "$result" | tee -a $GITHUB_OUTPUT
echo "GTS_JSON=$json_result" | tee -a $GITHUB_OUTPUT

# write to step summary
echo '```env' >> $GITHUB_STEP_SUMMARY
echo "$result" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

echo '```json' >> $GITHUB_STEP_SUMMARY
echo "$json_result" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY
