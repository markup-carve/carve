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

## Every new guard ships with a demonstrated failure

A check nobody has watched fail is not evidence of anything. This repo has found
enough green checks that could not fail on their own subject
(`markup-carve/carve#755` collects them) that the demonstration is now part of
the change rather than a courtesy.

- When you add or tighten a test, gate or assertion, break the thing it guards,
  observe it fail, and put both in the PR body: the named mutation, and which
  cases it broke. Then restore and confirm green again.
- When you fix a defect, the same in reverse: put the old code back and say how
  many of the new cases fail on it. A fix where that number is zero has not been
  tested.
- Say what the guard cannot see. A check is bounded by the inputs it is given,
  and "no input we ever feed it would fail this" is the failure mode hardest to
  spot in review.
- A mutation that comes back green needs diagnosing before it is believed. A
  no-op patch, a stale build and a genuinely unpinned rule all look the same.
- Any runner that compares or conforms a population must state how large that
  population should be and fail when it is smaller. Use `shortfall` and
  `miscount` from `scripts/spec/participants.mjs` rather than printing a count
  and trusting the reader to know the right one.

## What settles a question

Only `resources/grammar.ebnf` does. The executable artifacts
(`resources/carve-core.ohm`, `scripts/spec/*.mjs`) and the engines are
measured, never cited: "the executable spec does X" and "carve-js does X" are
observations about an implementation, and both have been wrong while being
believed.

- **Open a ruling with the clause it turns on.** If no clause reaches the
  shape, that is the finding, and the PR adds one.
- **Measure against the committed golden, not against an implementation.** A
  pinned engine goes stale, and then it reports the pin as a defect in whatever
  it is grading. That has already produced nine false grammar findings in one
  satellite (tree-sitter-carve#160).
- **A generated golden is a proposal.** `npm run corpus:build` writes pairs;
  the review that commits them is what makes them the answer.
- **Never settle a cross-engine question by counting engines.** Three engines
  agreeing is evidence that a shape is unpinned, not that it is correct.

## What earns a clause

Every normative clause is paid for by three engines, the executable checkers,
the corpus, and every satellite grammar that then has to classify the new
category. That cost is worth paying for a rule an author can run into, and is
pure overhead for one nobody can.

So a new clause needs at least one of:

- **An author-visible document.** Someone writing Carve by hand can plausibly
  produce the shape, and the answer changes what they get.
- **A visible rendering difference.** Two implementations produce different
  output for that shape today, and a reader of the output could tell.

Neither is a measurement of what implementations happen to do - "the three
engines disagree" is what makes it a *question*, not what makes it worth
answering. A shape that fails both tests is recorded as **unruled: engines may
differ**, in the ticket and in the divergence list, and the productions are
left alone.

Recording it that way is a real outcome, not a deferral. It states that the
project looked, found nothing an author or a reader can observe, and declined
to spend the cost. A later ticket that finds an author-visible consequence
reopens it with evidence attached, which is a stronger starting point than the
original.

Two worked examples, both from the same week:

- **Earns a clause.** The inline attribute block's interior (carve#906):
  `*x*{.a<TAB>.b}` is a shape a hand-writing author produces by pressing Tab,
  three corpus documents already pinned an answer, and the two readings differ
  visibly - attributes applied, or literal braces in the output.
- **Does not, on its own.** A tab in a link-title slot (carve#907):
  `[t](/u<TAB>"T")`. No corpus document pinned either answer in either
  direction, and no rendered output differs, because every engine and every
  writer normalizes the slot away. It is worth a clause only as part of the
  positional rule it belongs to, not as a question of its own.

The gate binds new clauses. It is not a reason to delete an existing one: a
clause already carried by the corpus and the engines costs nothing further to
keep, and removing it re-opens a settled question.

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
