## Changesets in Creator Inbox

This repository uses Changesets for semantic versioning and GitHub release notes.

Primary workflow:

1. Open PRs into `dev`.
2. Add exactly one primary label: `feat`, `fix`, `enhancement`, `chore`, or `docs`.
3. Optionally add `breaking` to force a major release.
4. On PR merge to `dev`, automation creates a changeset file.
5. When `dev` is merged into `main`, release automation versions, tags, and creates a GitHub release.

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
