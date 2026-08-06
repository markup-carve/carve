# Contributing to Carve

Carve is maintained as an ecosystem, not a single repository.

Before changing code or docs here, read [MAINTAINING.md](../MAINTAINING.md).
That file is the detailed reference for the spec/implementation lockstep,
re-vendoring rules, corpus generation, and downstream coordination.

## Repositories

The core repos currently move together:

- `carve`: the specification and conformance corpus
- `carve-js`: the reference TypeScript implementation
- `carve-php`: the PHP implementation

Changes that affect behavior usually need coordinated follow-up across more than
one repo.

## Contribution expectations

- Open a PR for every non-trivial change.
- Check for existing open PRs before starting parallel work, especially for
  spec bumps and implementation-sync changes.
- Keep branches focused. Do not mix unrelated cleanup with behavior changes.
- Run the relevant test suite before opening or updating a PR.
- Check CI after opening the PR and follow through on failures or review
  comments.

For this repo in particular:

- Node.js 24 is the minimum (`package.json` `engines`, and `.nvmrc` selects it).
  CI runs the conformance corpus on Node 24 and 26.
- Spec or examples changes should normally keep `npm test` green.
- If you change `docs/examples.md`, regenerate the corpus and verify the
  resulting fixture diff is intentional.
- If you move the pinned `@markup-carve/carve` commit (`npm run bump-carve-pin`),
  pin only a commit merged to `carve-js` `main`, not a local branch build.

## Typical change order

For a cross-cutting behavior change:

1. Update the reference implementation (`carve-js`) first.
2. Merge that implementation change.
3. Update `carve` with the spec/examples/corpus and re-vendor the built output.
4. Update other implementations such as `carve-php`.

If the work is primarily normative contract or spec text, land that in `carve`
first, then implement against the frozen contract.

## Language implementations in the org

Language implementations do not need to live outside the GitHub organization.
If an implementation is active and aligned with the project direction, it can be
hosted directly in the `markup-carve` org.

Contributors who are actively building or maintaining an implementation can be
granted maintainer access for that implementation repository so they can manage
issues, branches, CI, releases, and follow-up PRs directly.

The bar is practical stewardship:

- sustained contribution
- responsiveness to review and CI
- willingness to keep the implementation aligned with the spec corpus
- willingness to coordinate breaking or cross-repo changes

Maintainer access for one implementation repo does not automatically imply
maintainer access everywhere else in the org.

## When in doubt

- Prefer small PRs.
- Prefer explicit spec/corpus updates over undocumented behavior drift.
- Prefer asking whether a change is normative, implementation-specific, or
  app-extension behavior before expanding scope.
