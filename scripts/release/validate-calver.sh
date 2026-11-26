#!/usr/bin/env bash
set -euo pipefail

version=${1:?Provide a release version}
if [[ $version =~ ^([1-9][0-9]{3})[.]([1-9][0-9]?)[.]([1-9][0-9]?)$ ]]; then
    iso_date="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
    if canonical=$(date -u --date="$iso_date" +'%Y.%-m.%-d' 2>/dev/null) && [[ $canonical == "$version" ]]; then
        exit 0
    fi
fi

printf 'Expected a valid UTC release date in YYYY.M.D format. Got %s.\n' "$version" >&2
exit 1
