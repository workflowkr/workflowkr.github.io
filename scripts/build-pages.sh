#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
publish_dir="$(mktemp -d "${TMPDIR:-/tmp}/workflowkr-pages.XXXXXX")"

copy_site() {
  local site_source="$1"
  local destination="$2"
  mkdir -p "$destination"
  cp "$site_source/web.html" "$destination/index.html"
  cp -R "$site_source/assets" "$destination/assets"
}

copy_site "$source_dir" "$publish_dir"
if [[ "${1:-}" == --with-experiments ]]; then
  copy_site "$source_dir/experiments/v4" "$publish_dir/experiments/v4"
fi

cd "$publish_dir"
pwd -P
