# Releasing zed2cli

There are two parts. A one time setup, where you connect npm to this GitHub
repository using trusted publishing, and the release itself, which after setup
is a single push to `main`.

## Why trusted publishing, not a token

npm revoked all classic tokens in December 2025, so automation tokens no longer
exist and cannot be recreated. Tokens that bypass two factor authentication can
still publish for now, but they lose direct publish access in January 2027.
Trusted publishing replaces the token entirely: the workflow proves its
identity to npm with a short lived OIDC credential, and npm attaches a
provenance statement automatically. Nothing long lived is stored, so there is
nothing to leak or rotate.

## What you need

**The package must already exist on npm.** Trusted publishers are configured in
the settings of an existing package. `zed2cli` already exists (1.0.0 was
published), so you can configure it right away. If you ever start a brand new
package, publish it once by hand or with a short lived token, then configure
trusted publishing.

**npm CLI 11.5.1 or newer and Node 22.14 or newer.** The workflow uses Node 24,
which bundles npm 11.19, so you do not need to install anything locally.

**GitHub hosted runners.** Self hosted runners are not supported. The workflow
uses `ubuntu-latest`, which is fine.

## One time setup: add the trusted publisher

1. Open the package on npm: https://www.npmjs.com/package/zed2cli
2. Click the Settings tab on that page, then find the Trusted Publisher
   section.
3. Under "Select your publisher", click GitHub Actions.
4. Fill in the fields exactly:
   1. **Organization or user**: `6yte96`
   2. **Repository**: `zed2cli`
   3. **Workflow filename**: `publish.yml`, only the filename, not the path, and
      it must include the `.yml` extension
   4. **Environment name**: leave this empty, because the workflow uses no
      GitHub environment
   5. **Allowed actions**: turn on **Allow npm publish**. Configurations created
      after September 2026 allow staged publishing only by default, and direct
      `npm publish` will be refused until you enable this.
5. Save the configuration.

Everything is case sensitive. npm does not validate the details when you save
them, so mistakes only show up at publish time.

### Two things that invalidate a new configuration

**The two day window.** A new configuration must complete its first successful
publish within 2 days, which also binds it to the repository. If it expires,
delete it and create a new one, then publish within 2 days again.

**The repository field.** `package.json` has
`"repository": "git+https://github.com/6yte96/zed2cli.git"`, which matches this
GitHub repository. If that field pointed at a fork or a different repo, the
publish would be refused.

## Releasing

1. Update `CHANGELOG.md` with what changed, and commit it.
2. Bump the version:

   ```bash
   npm version patch        # or minor, or major
   ```

   `npm version` edits `package.json`, makes the commit, and creates the local
   `vX.Y.Z` tag. It needs a clean working tree, so commit the changelog first.
3. Push the commit and the tag:

   ```bash
   git push origin main --follow-tags
   ```

If you prefer to skip step 2's tag, edit the version in `package.json`, commit,
and push the branch alone. The workflow creates the tag for you, so both routes
work.

After the push, the Publish workflow:

1. runs every check,
2. reads the version from `package.json`,
3. publishes to npm if that version is not already there, authenticating with
   trusted publishing and generating provenance automatically,
4. creates the git tag `vX.Y.Z` if it is missing, and a GitHub release with
   generated notes,
5. does nothing if the version was already published, so a push with no version
   change is always safe.

## After the first successful publish: lock it down

Trusted publishers keep working even when tokens are disabled. Open the package
settings, go to Publishing access, select **Require two-factor authentication
and disallow tokens**, and click Update Package Settings. This blocks any
traditional token from publishing to `zed2cli`, while the workflow continues to
work through OIDC.

## Versioning rules

**MAJOR** for a breaking change, for example dropping the OpenCode 1 plugin, or
changing the config shape or the request envelope.

**MINOR** for a new feature that stays compatible, for example a new CLI
command or a new integration.

**PATCH** for a fix that changes no interface.

The 2.0.0 release was a major bump because the OpenCode integration moved to
the OpenCode 2 plugin API.

## Where the version lives

**`package.json`** is the source of truth. `zed2cli version` prints it.

**`src/package.json`** is the nested plugin package. Keep its version equal to
the main one.

**`CHANGELOG.md`** gets a new section at the top for each release.

**Git tags** are `v` plus the version, for example `v2.0.0`.

## If trusted publishing fails

**`EENEEDAUTH` or "Unable to authenticate".** The workflow filename does not
match what you configured, the `id-token: write` permission is missing, the
owner or repository name is wrong, or you are on a self hosted runner. All four
fields must match exactly.

**A 404 during publish.** npm is older than 11.5.1 or Node is older than 22.14.
The workflow pins Node 24, so this only happens if you publish from somewhere
else.

**The configuration expired.** You did not complete a publish within 2 days.
Delete the trusted publisher and add it again.

**Repository mismatch.** `package.json` `repository.url` must match the GitHub
repository exactly.

### Temporary fallback with a token

If you must publish without OIDC, create a Granular Access Token instead of an
automation token, scoped to `zed2cli` with Read and write and a short expiry,
store it as the repository secret `NPM_TOKEN`, and add this to the publish step
in the workflow:

```yaml
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

This is a stopgap. Bypass two factor tokens lose direct publish access in
January 2027, so trusted publishing is the durable path.

## Verifying a release

**npm view**: `npm view zed2cli version` should print the new version.

**One off run**: `npx zed2cli@2.0.0 version` should print `2.0.0`.

**Web**: the npm page at https://www.npmjs.com/package/zed2cli, and the Tags
and Releases pages on GitHub.

**Provenance**: the npm package page shows a provenance badge that links the
published tarball to this repository and the exact workflow run that built it.
That badge only appears when publishing through trusted publishing from a
public repository, which is exactly what this setup does.
