#!/bin/sh

set -eu

sh -c "git config --global --add safe.directory $PWD"

result=$(git-that-semver "$@")
json_result=$(git-that-semver "$@" -o json -c output.json.indent=2)
yaml_result=$(git-that-semver "$@" -o yaml)

# write to output
echo "$result" | tee -a $GITHUB_OUTPUT

{
    echo 'GTS_JSON<<EOF'
    echo "$json_result"
    echo EOF
} >> $GITHUB_OUTPUT

{
    echo 'GTS_YAML<<EOF'
    echo "$yaml_result"
    echo EOF
} >> $GITHUB_OUTPUT

# write to step summary
echo '```env' >> $GITHUB_STEP_SUMMARY
echo "$result" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

echo '```json' >> $GITHUB_STEP_SUMMARY
echo "$json_result" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

echo '```yaml' >> $GITHUB_STEP_SUMMARY
echo "$yaml_result" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY
