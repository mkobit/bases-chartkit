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
After each merge, `Release please` automatically opens or updates a `chore: release X.Y.Z` PR that bumps `package.json`, `manifest.json`, and updates `CHANGELOG.md`.
Edit the CHANGELOG entry in that PR to customise the release notes before merging.
Merging the release PR creates a bare `X.Y.Z` git tag, which triggers the `Release` workflow.
`Release` builds the plugin and uploads `main.js`, `manifest.json`, and `styles.css` to the GitHub release.

## Version bump rules

| Prefix | Bump |
|---|---|
| `feat:` | minor |
| `fix:`, `perf:` | patch |
| `BREAKING CHANGE` in commit footer | major (minor while pre-1.0 — see note) |
| `deps:`, `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `style:`, `revert:`, `build:`, `infra:` | no bump |

> [!NOTE]
> `release-please-config.json` sets `bump-minor-pre-major: true`, so while the released version is `0.x.y`, breaking changes bump the minor segment (e.g., `0.10.1` → `0.11.0`) rather than the major.
> Once the project releases `1.0.0`, breaking changes bump major.

## Forcing a specific version

To seed a release at a specific version (e.g., the first `0.1.0`), merge an empty commit with a `Release-As: X.Y.Z` footer:

```bash
git commit --allow-empty -m "chore: release 0.1.0" -m "Release-As: 0.1.0"
git push
```

## `versions.json` and `minAppVersion`

`versions.json` maps plugin versions to the minimum Obsidian app version they require.
release-please does NOT auto-update this file.
Only add an entry when the plugin's `minAppVersion` actually changes — e.g., if `0.4.0` starts requiring Obsidian `1.12.0`, add `"0.4.0": "1.12.0"`.

## Manual re-trigger

If the `Release` workflow fails after a release PR is merged, re-run it from the Actions tab → Release → Run workflow.
The tag must already exist; the workflow reads it from the trigger ref or accepts manual dispatch.

## Tag format

Tags are bare `X.Y.Z` (no `v` prefix) per Obsidian community-plugin convention (`include-v-in-tag: false` in `release-please-config.json`).
