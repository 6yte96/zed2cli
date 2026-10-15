# Changelog

All notable changes to zed2cli are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.0.0

Released 2026-10-16.

**OpenCode 2 support.** The plugin was ported to the OpenCode 2 plugin API and
now runs in process, with no bridge proxy. It registers all 16 `zed-ai` models,
streams replies, and completes tool call round trips. The OpenCode 1 plugin is
preserved as `src/index.v1.mjs`, and the installer picks the right one for the
OpenCode version it detects.

**Token diagnostics.** Every token source is decoded and reported with its
expiry. `zed2cli doctor` lists the keyring resolver, `ZED_TOKEN`,
`~/.zed_jwt_token`, the saved access token, and the OpenCode credential, and it
detects the OpenCode version and the proxy state. The proxy logs expiry at
startup and exposes it on `/health`.

**Clear failure messages.** An expired or missing token now says so, instead of
a bare `401` or `Model unavailable`. The proxy turns upstream `401` and `451`
into plain guidance, and the resolver skips an expired `ZED_TOKEN` so a dead
environment variable cannot beat a live keyring token.

**pi extension fix.** The extension is registered at its current path, and the
installer drops an earlier entry whose file no longer exists, which `pi remove`
cannot match.

**Publish pipeline.** A push to main publishes to npm automatically when the
version in `package.json` is new, authenticating with npm trusted publishing
and attaching provenance, then creates a matching git tag and GitHub release. A
catalog drift check keeps the pi model list in step with `src/models.mjs`.

**Documentation.** `README.md` was rewritten with the user content first.
`INSTALL.md` covers install, and `RELEASING.md` covers publishing.

## 1.0.0

Released 2026-08-13.

First release. The CLI, the keyring token resolver, the bridge proxy, the
OpenCode 1 plugin, the pi extension, the geo block diagnosis, and the JWT
refresh daemon.
