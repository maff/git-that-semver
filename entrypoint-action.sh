#!/bin/sh

set -eu

sh -c "git config --global --add safe.directory $PWD"

# create and write ENV result (individual env variables)
if [ "$INPUT_ENV" = "true" ]; then
    env_result=$(git-that-semver "$@")
    echo "$env_result" | tee -a $GITHUB_OUTPUT
    echo ""

    echo '```env' >> $GITHUB_STEP_SUMMARY
    echo "$env_result" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
fi

# create and write JSON result
if [ "$INPUT_JSON" = "true" ]; then
    json_result=$(git-that-semver "$@" -o json -c output.json.indent=2)
    {
        echo 'GTS_JSON<<EOF'
        echo "$json_result"
        echo EOF
    } | tee -a $GITHUB_OUTPUT
    echo ""

    echo '```json' >> $GITHUB_STEP_SUMMARY
    echo "$json_result" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
fi

# create and write YAML result
if [ "$INPUT_YAML" = "true" ]; then
    yaml_result=$(git-that-semver "$@" -o yaml)
    {
        echo 'GTS_YAML<<EOF'
        echo "$yaml_result"
        echo EOF
    } | tee -a $GITHUB_OUTPUT
    echo ""

    echo '```yaml' >> $GITHUB_STEP_SUMMARY
    echo "$yaml_result" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
fi
