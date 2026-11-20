#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
publish_dir="$(mktemp -d "${TMPDIR:-/tmp}/workflowkr-pages.XXXXXX")"

cp "$source_dir/web.html" "$publish_dir/index.html"
cp -R "$source_dir/assets" "$publish_dir/assets"

cd "$publish_dir"
pwd -P
