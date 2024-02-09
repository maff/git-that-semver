#!/bin/sh

set -eu

sh -c "git config --global --add safe.directory $PWD"

gsr "$@"
