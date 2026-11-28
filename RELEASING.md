# Releasing

## One-time setup

1. **`RELEASE_PLEASE_TOKEN` secret** — create a fine-grained PAT or GitHub App token with `contents: write` and `pull-requests: write` on this repo.
   Add it under Settings → Secrets and variables → Actions as `RELEASE_PLEASE_TOKEN`.
   Without this, the `Release please` workflow fails with `Input required and not supplied: token`.
   (Using the default `GITHUB_TOKEN` would work but PRs it creates do not trigger CI checks.)

2. **Allow Actions to create PRs** — Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests".

3. **Community plugins index (one-time)** — to be listed in Obsidian's community plugins browser, submit a PR to [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases) adding this plugin's entry to `community-plugins.json`.
   Do this after the first stable release tag exists.

## Normal release

Merge PRs to `main` using conventional commit prefixes (`feat:`, `fix:`, `deps:`, etc.).
`Release please` opens or updates a `chore: release YYYY.M.D` PR only when the commit merged to `main` includes a valid `Release-As: YYYY.M.D` trailer.
This only maintains a pending PR — it does not publish anything by itself.
Edit the `CHANGELOG.md` entry in that PR to customize the release notes before merging.
Merging the release PR updates `.release-please-manifest.json`, `package.json`, `manifest.json`, and `CHANGELOG.md`, creates the git tag and draft GitHub Release, and invokes the `Release` workflow via `workflow_call`.
`Release` builds the plugin, uploads `main.js`, `manifest.json`, and `styles.css` to the draft release, then publishes it (`gh release edit --draft=false`).
The release is made non-draft (and locked by GitHub's immutable-releases setting) only after its assets are attached — see `## Draft release + immutable-releases interaction`.

## Versioning and changelog

The plugin uses CalVer (`YYYY.M.D`) with one stable release per UTC day.
Set release versions explicitly with a `Release-As: YYYY.M.D` trailer.
Conventional commit prefixes organize `CHANGELOG.md` sections; hidden types are omitted:

| Prefix | Changelog section |
|---|---|
| `feat:` | Features |
| `fix:` | Bug fixes |
| `perf:` | Performance improvements |
| `deps:` | Dependency updates |
| `docs:` | Documentation |
| `chore:`, `ci:`, `test:`, `refactor:`, `style:`, `revert:`, `build:`, `infra:` | Omitted (hidden) |

## Forcing a specific version

`main` is protected against direct `git push` (GH013).
To trigger a release for a specific version (for example, `2026.11.27`), include `Release-As: YYYY.M.D` in the squash-merge commit message on `main` (for example, by squash-merging a PR with `Release-As: 2026.11.27` in the commit footer):

```text
chore: prepare release 2026.11.27

Release-As: 2026.11.27
```

## `versions.json` and `minAppVersion`

`versions.json` maps plugin versions to the minimum Obsidian app version they require.
`release-please` does not auto-update this file.
Add an entry only when `minAppVersion` changes.
For example, if `2026.11.27` starts requiring Obsidian `1.12.0`, add `"2026.11.27": "1.12.0"`.

## Manual re-trigger

If the `Release` workflow fails, or didn't attach assets to an existing release, re-run it from the Actions tab → Release → Run workflow, supplying the existing release's tag as the `tag` input.
The upload step uses `--clobber`, so re-running it is safe even if some assets already exist — but once a release has been published (non-draft), GitHub's immutable-releases setting rejects any asset upload with HTTP 422, so this only helps while the release is still in its draft window (e.g. the `Release` workflow failed after creating the tag but before publishing).

## Tag format

Tags use bare `YYYY.M.D` format (no `v` prefix and no package-name prefix) per Obsidian community-plugin convention.
The tag must equal `manifest.json` `.version`.
`release-please-config.json` sets `release-type` to `simple` and `include-v-in-tag` to `false` to produce this format (`node` release-type would prepend `package.json`'s `name` to the tag, which Obsidian does not expect).

## Release validation

Two scripts in `scripts/release/` validate release versions and metadata.

### `validate-calver.sh`

Run `bash scripts/release/validate-calver.sh <version>` to validate a CalVer release version.
The `release-please.yml` and `release.yml` workflows run this check.

- Requires `<version>` in `YYYY.M.D` format (4-digit year, unpadded month and day, dot-separated).
- Verifies that `<version>` is a valid UTC calendar date.
- Exits `0` if valid, `1` if invalid, or non-zero if `<version>` is missing.

### `validate-metadata.sh`

Run `bash scripts/release/validate-metadata.sh <release-tag> [metadata-dir]` to validate release metadata files.
`[metadata-dir]` defaults to `.`.
The `release.yml` workflow runs this check.

- Reads `manifest.json`, `package.json`, and `versions.json` from `[metadata-dir]`.
- Verifies `<release-tag>` is bare `X.Y.Z` (three dot-separated non-negative integers without leading zeros or `v` prefix).
  Checking `X.Y.Z` here keeps historical SemVer keys (`0.0.1`, `0.2.0`) in `versions.json` valid, while `validate-calver.sh` enforces `YYYY.M.D` for new releases in `release-please.yml` and `release.yml`.
- Verifies `manifest.json` `.version` and `package.json` `.version` equal `<release-tag>`.
- Verifies `manifest.json` `.minAppVersion` is a non-empty string.
- Verifies all `versions.json` keys and values are valid.
- Verifies `manifest.json` `.minAppVersion` matches the greatest `versions.json` key `<= <release-tag>`.
- Exits `0` if all checks pass and `1` on any error.

## Draft release + immutable-releases interaction

GitHub's immutable-releases setting locks a release's assets and tag the moment the release is published (non-draft) — `gh release upload` returns HTTP 422 against an already-published release.
`release-please-config.json` sets `draft: true` so `release-please` creates the GitHub Release as a draft rather than published.
`release-please-config.json` also sets `force-tag-creation: true` so the tag exists immediately and `release.yml` (invoked via `workflow_call`) can check out `refs/tags/<tag>`.
`Release` attaches assets to the still-draft release, then explicitly publishes it (`gh release edit --draft=false`) as its last step, so assets are always present before the release becomes immutable.

> [!NOTE]
> `bases-chartkit-0.1.0` and `0.1.1`+ are historical pre-CalVer releases.
> `bases-chartkit-0.1.0` (the first release) predates this fix — it was published non-draft immediately with zero assets attached, and is permanently stuck that way. Treat it as broken; `0.1.1`+ are the first releases using the draft-then-publish flow.
