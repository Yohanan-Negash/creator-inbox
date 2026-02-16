## Changesets in Creator Inbox

This repository uses Changesets for semantic versioning and GitHub release notes.

Primary workflow:

1. Open PRs into `dev`.
2. Open one release PR from `dev` to `main`.
3. Add exactly one primary label: `feat`, `fix`, `enhancement`, `chore`, or `docs`.
4. Optionally add `breaking` to force a major release.
5. On merge to `main`, automation creates a changeset, versions, tags, and publishes a GitHub release.

Label to bump mapping:

- `feat` -> minor
- `fix` -> patch
- `enhancement` -> patch
- `chore` -> patch
- `docs` -> patch
- `breaking` -> major override

Release note prefix mapping:

- `feat:`
- `fix:`
- `enhancement:`
- `chore:`
- `docs:`
