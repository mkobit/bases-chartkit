#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || -z ${1:-} ]]; then
    printf 'Usage: %s <release-tag> [metadata-dir]\n' "$0" >&2
    exit 1
fi

tag=$1
metadata_dir=${2:-.}

version_regex='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
if [[ ! $tag =~ $version_regex ]]; then
    printf 'Invalid release tag "%s": expected bare X.Y.Z version with non-negative integers and no leading zeros or "v" prefix.\n' "$tag" >&2
    exit 1
fi

if [[ ! -d $metadata_dir ]]; then
    printf 'Metadata directory does not exist: %s\n' "$metadata_dir" >&2
    exit 1
fi

manifest_file="${metadata_dir}/manifest.json"
package_file="${metadata_dir}/package.json"
versions_file="${metadata_dir}/versions.json"

for file in "$manifest_file" "$package_file" "$versions_file"; do
    if [[ ! -f $file ]]; then
        printf 'Missing required metadata file: %s\n' "$file" >&2
        exit 1
    fi
    if ! jq -e 'type == "object"' "$file" >/dev/null 2>&1; then
        printf 'Invalid JSON object in metadata file: %s\n' "$file" >&2
        exit 1
    fi
done

manifest_version=$(jq -r 'if (.version | type == "string") then .version else empty end' "$manifest_file")
if [[ $manifest_version != "$tag" ]]; then
    printf 'Version mismatch in %s: expected "%s", got "%s".\n' "$manifest_file" "$tag" "${manifest_version:-<missing or non-string>}" >&2
    exit 1
fi

package_version=$(jq -r 'if (.version | type == "string") then .version else empty end' "$package_file")
if [[ $package_version != "$tag" ]]; then
    printf 'Version mismatch in %s: expected "%s", got "%s".\n' "$package_file" "$tag" "${package_version:-<missing or non-string>}" >&2
    exit 1
fi

manifest_min_app_version=$(jq -r 'if (.minAppVersion | type == "string" and length > 0) then .minAppVersion else empty end' "$manifest_file")
if [[ -z $manifest_min_app_version ]]; then
    printf 'Missing or empty "minAppVersion" string in %s.\n' "$manifest_file" >&2
    exit 1
fi

invalid_versions=$(jq -r --arg re "$version_regex" '
    to_entries
    | map(
        if (.key | test($re) | not) then
            "invalid version key \"" + .key + "\""
        elif (.value | (type == "string" and length > 0) | not) then
            "invalid minAppVersion value for key \"" + .key + "\""
        else
            empty
        end
    )
    | .[]
' "$versions_file")

if [[ -n $invalid_versions ]]; then
    printf 'Invalid entries in %s:\n%s\n' "$versions_file" "$invalid_versions" >&2
    exit 1
fi

applicable_entry=$(jq -c --arg tag "$tag" '
    def to_tuple: split(".") | map(tonumber);
    ($tag | to_tuple) as $target
    | to_entries
    | map(select((.key | to_tuple) <= $target))
    | if length == 0 then empty else max_by(.key | to_tuple) end
' "$versions_file")

if [[ -z $applicable_entry ]]; then
    printf 'No applicable entry in %s for release tag "%s" (no key <= tag).\n' "$versions_file" "$tag" >&2
    exit 1
fi

applicable_key=$(jq -r '.key' <<<"$applicable_entry")
expected_min_app_version=$(jq -r '.value' <<<"$applicable_entry")

if [[ $manifest_min_app_version != "$expected_min_app_version" ]]; then
    printf 'minAppVersion mismatch: %s has "%s", but %s["%s"] requires "%s".\n' \
        "$manifest_file" "$manifest_min_app_version" "$versions_file" "$applicable_key" "$expected_min_app_version" >&2
    exit 1
fi
