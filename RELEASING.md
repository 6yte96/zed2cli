# Releasing zed2cli

There are two parts. A one time setup, where you bring an npm token and store
it as a GitHub secret, and the release itself, which after setup is a single
push to `main`.

## One time setup

### 1. Have an npm account with publish rights

If you do not have one, sign up at https://www.npmjs.com/signup and verify your
email. You need publish rights to the `zed2cli` package, which means owning it
or being listed as a maintainer. The first publish creates the package if it
does not exist yet.

### 2. Bring (create) an npm token

1. Sign in at https://www.npmjs.com.
2. Open Access Tokens: click your avatar, then Access Tokens, or go straight to
   https://www.npmjs.com/settings/YOUR_USERNAME/tokens (replace
   `YOUR_USERNAME`).
3. Click Generate New Token, then choose Automation.
4. Copy the token now. npm shows it once. It looks like
   `npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`.

Why Automation: automation tokens are made for continuous integration. They
bypass the two factor prompt, which a non-interactive workflow needs, and they
are scoped to publishing. A Granular Access Token also works if you scope it to
the `zed2cli` package with Read and write. Automation is the simplest choice.

Keep the token private. Anyone with it can publish to every package your
account can publish to.

### 3. Store the token as the repository secret

1. Open the repository: https://github.com/6yte96/zed2cli.
2. Go to Settings, then Secrets and variables, then Actions.
3. Under the Secrets tab, click New repository secret.
4. Name it exactly `NPM_TOKEN`.
5. Paste the token as the value, then click Add secret.

That is the whole setup. The publish workflow reads it as
`${{ secrets.NPM_TOKEN }}`.

### 4. Optional, trusted publishing instead of a token

npm supports trusted publishing through GitHub OIDC, which removes the stored
token entirely. On npmjs.com, open the package settings, then Publishing
access, and add a trusted publisher for the GitHub repository `6yte96/zed2cli`
and the workflow file `publish.yml`. Then edit `.github/workflows/publish.yml`
and delete the `NODE_AUTH_TOKEN` line from the publish step, keeping
`id-token: write`. Releases then authenticate with no secret at all.

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
3. publishes to npm with provenance if that version is not already there,
4. creates the git tag `vX.Y.Z` if it is missing, and a GitHub release with
   generated notes,
5. does nothing if the version was already published, so a push with no version
   change is always safe.

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

## Retrying a failed release

If the workflow fails before it publishes, fix the cause and push again, or
open the Actions tab and re-run the job.

If it published to npm and then failed at the tag or release step, push another
commit, or run the two commands by hand:

```bash
git tag -a v2.0.0 -m "zed2cli 2.0.0" && git push origin v2.0.0
gh release create v2.0.0 --title v2.0.0 --generate-notes
```

The version is already on npm, so the next workflow run skips publishing.

## Verifying a release

**npm view**: `npm view zed2cli version` should print the new version.

**One off run**: `npx zed2cli@2.0.0 version` should print `2.0.0`.

**Web**: the npm page at https://www.npmjs.com/package/zed2cli, and the Tags
and Releases pages on GitHub.

**Provenance**: the npm package page shows a provenance badge that links the
published tarball to this repository and the workflow run that built it.
