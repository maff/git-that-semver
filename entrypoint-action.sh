#!/bin/sh

set -eu

sh -c "git config --global --add safe.directory $PWD"

echo "ENV START"
env
echo "ENV END"

git-that-semver -c output.env.arrayDelimiter=, "$@" > /tmp/git-that-semver.env

cat /tmp/git-that-semver.env | tee -a $GITHUB_OUTPUT

echo '### git-that-semver result' >> $GITHUB_STEP_SUMMARY
echo '```env' >> $GITHUB_STEP_SUMMARY
cat /tmp/git-that-semver.env >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY
