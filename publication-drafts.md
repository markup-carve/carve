# Carve Publication Drafts

<!-- markdownlint-disable MD013 MD024 MD034 -->

## Review notes

These are working drafts, not published copy. Replace the article URL placeholder
before use. The first campaign is deliberately narrow: one canonical technical
article, one Show HN launch, one programming-languages discussion, two curated-list
submissions, and two newsletter pitches.

Recommended order:

1. Publish the technical article on the Carve site or maintainer blog.
2. Launch Show HN with the playground as the primary link.
3. Submit the article to Lobsters if an established member considers it suitable.
4. Open a first-party discussion on the CommonMark forum.
5. Adapt the design discussion for r/ProgrammingLanguages.
6. Pitch the Rust and PHP versions only after their linked articles exist.

Do not reuse identical copy across communities. Do not ask for stars, votes, or
upvotes. The useful calls to action are trying the playground, challenging a design
decision, reporting a divergent parse, or testing a real document.

## Canonical article draft

### Working title

Three parsers, one result: building an executable specification for Carve

### Alternative titles

- Keeping JavaScript, PHP, and Rust markup parsers behaviorally identical
- A markup specification you can execute
- What three implementations taught me about specifying a document language

### Draft

Lightweight markup formats are often described by examples first and rules second.
That makes a new syntax easy to demonstrate, but it leaves implementers with an
awkward question: when two plausible parsers disagree, which result is correct?

Carve takes the opposite approach. It is a lightweight document-markup language,
but its most important artifact is not its delimiter syntax. It is a shared corpus
that turns the language specification into executable expectations for JavaScript,
PHP, and Rust implementations.

The immediate benefit is easy to state: the same Carve input should produce the
same document structure and output in every supported runtime. The interesting
part is what had to become explicit before that sentence could be true.

#### The problem with prose-only compatibility

A prose specification can say that a heading begins with a marker, a table cell may
span columns, or an attribute belongs to the preceding block. Each sentence sounds
precise until it meets adjacent syntax:

- Does a marker interrupt a paragraph without a blank line?
- Does indentation belong to a list item or its child block?
- What happens when an attribute could attach to either a caption or an image?
- Which delimiter wins when two inline forms begin at the same byte?
- Is malformed syntax literal text, a warning, or an error?

If those boundaries are not represented in examples, each implementation fills
them in independently. “Supports the same syntax” then means only that the happy
paths look similar.

Carve's corpus stores inputs beside their expected output. The reference engines
consume the same cases rather than maintaining language-specific interpretations
of the test suite. Core cases establish the language contract; optional cases
cover host-dependent extensions without pretending that every runtime provides
the same application features.

#### Conformance is more than snapshot testing

Snapshots are useful, but a pile of snapshots is not automatically a specification.
The cases have to be organized around observable rules. A useful case says what
boundary it fixes, why another result would be plausible, and which part of the
language owns the behavior.

For example, a table test should not merely contain a large table that happens to
exercise alignment, spans, and captions. Small cases should isolate each rule,
followed by combinations that expose interactions. When an implementation fails,
the maintainer should be able to tell whether the bug is in tokenization, block
ownership, inline parsing, resolution, or rendering.

This structure also makes omissions visible. If the prose promises a behavior but
no fixture pins it, that is a specification gap even when all engines are green.

#### Three implementations are a specification tool

Implementing a grammar once can conceal assumptions in the code. Reimplementing it
in another language is adversarial in a productive way: data structures, standard
libraries, regex behavior, Unicode handling, and parser architecture stop sharing
the same accidental defaults.

JavaScript, PHP, and Rust also represent the kinds of environments Carve aims to
cross. A document might be edited in a browser, stored and rendered by a PHP
application, then linted or converted by a Rust CLI. Compatibility matters at the
AST and serialization boundaries, not only in a single web page.

When the engines disagree, the resolution is not “make the others match the first
implementation.” The disagreement is traced back to the intended rule. If the rule
is unclear, the specification and corpus change together; if it is clear, the
implementation changes. That distinction prevents a reference implementation's
bugs from silently becoming the language.

#### What the corpus does not prove

Passing a shared corpus is strong evidence about the behavior represented by that
corpus. It does not prove that an implementation has no bugs, that every integration
is mature, or that different renderers will be byte-identical outside the contracted
surface.

It also does not remove the cost of adopting a new source format. Carve is not
Markdown, and familiar delimiters can mean different things. Migration tools,
linting, editor support, and explicit versioning reduce that cost; they do not make
it disappear.

That is why Carve 0.1.5 is described as specified and shipping, while still carrying
a pre-1.0 compatibility warning. The project should make the stable boundary clear
instead of using a green test suite as a blanket maturity claim.

#### The language behind the tests

Carve is aimed at documents that outgrow basic Markdown but should remain readable
plain text. It includes captions, cross-references, tables with row and column spans,
footnotes, math, admonitions, attributes, editorial markup, and an extension
contract. It can render to HTML, Markdown, plain text, and ANSI, with a Pandoc bridge
for additional publishing formats.

The syntax is intentionally opinionated. Some choices will be attractive and others
will be deal-breakers. The more general claim is narrower: those choices should be
specified well enough that a document does not change meaning merely because an
application uses a different conforming engine.

#### Try to make it disagree

The browser playground is at https://markup-carve.github.io/carve/playground. The
specification and corpus are at https://github.com/markup-carve/carve, and the
implementation comparison is at
https://markup-carve.github.io/carve/implementation-comparison.

The most useful feedback is a small document that produces surprising output, a
rule that admits two reasonable readings, or a workflow where the portability
claim breaks down. If you can make the engines disagree, that is especially useful.

## Show HN draft

### Title

Show HN: Carve - a specified markup language with JS, PHP, and Rust engines

### Submission URL

https://markup-carve.github.io/carve/playground

### First comment

Hi HN - I built Carve because I wanted lightweight source that could express real
document structure without assembling a different plugin stack in every runtime.
It has captions and cross-references, rich tables, footnotes, math, admonitions,
attributes, editorial markup, and explicit extensions.

The part I care most about is predictable behavior. Carve 0.1.5 has a written grammar
and a shared conformance corpus used by JavaScript, PHP, and Rust implementations.
There are also Python, Ruby, Go, and WASM bindings, editor support, format importers,
and a Pandoc bridge. The playground runs without an account or installation.

Carve is intentionally not Markdown-compatible. For example, `*bold*`, `/italic/`,
and `_underline_` use visual mnemonics, and its table syntax has first-class captions
and spans. That creates a real switching cost, so the comparison and migration docs
call out collisions rather than hiding them.

Current status: 0.1.5 is specified and shipping, but it is pre-1.0 and minor
releases may still change the grammar under the documented versioning policy.

I would particularly value feedback on three things:

1. Can you find an ambiguous or surprising parse?
2. Does cross-runtime conformance solve a problem you actually have?
3. Which part of the first-run experience makes you hesitate or stop?

Playground: https://markup-carve.github.io/carve/playground

Specification and corpus: https://github.com/markup-carve/carve

Compatibility comparison: https://markup-carve.github.io/carve/comparison

## r/ProgrammingLanguages draft

### Title

I specified a lightweight markup language through one corpus and three parsers

### Body

I have been working on Carve, a document-markup language influenced by Markdown,
Djot, Org mode, Creole, AsciiDoc, and CriticMarkup. The syntax is the visible part,
but the experiment I would most like feedback on is the specification model.

JavaScript, PHP, and Rust implementations run the same input/output corpus. The
corpus is divided between native core behavior and host-dependent extensions, and
the spec tries to assign ambiguous-looking interactions to explicit phases such as
block parsing, inline parsing, resolution, and rendering.

Some design constraints were:

- one canonical spelling for a construct;
- no meaning carried only by trailing whitespace;
- literal fallback for malformed or unknown constructs where practical;
- source that can produce structured documents without raw HTML;
- predictable AST and output boundaries across runtimes;
- extensions that degrade to ordinary spans or blocks when a host does not know
  them.

This is not intended as a claim that everyone should leave Markdown. Carve makes
incompatible choices and adoption has a real ecosystem cost. I am trying to learn
whether the rules are actually precise, whether the corpus tests the right
boundaries, and where the grammar has merely moved complexity rather than removed
it.

The most helpful response would be one concrete input with two defensible readings,
or criticism of the conformance structure itself.

Specification/corpus: https://github.com/markup-carve/carve

Grammar: https://markup-carve.github.io/carve/grammar

Implementation comparison:
https://markup-carve.github.io/carve/implementation-comparison

Playground: https://markup-carve.github.io/carve/playground

I am the project maintainer.

## Lobsters submission draft

### Title

Three parsers, one result: building an executable markup specification

### URL

[CANONICAL ARTICLE URL]

### Suggested tags

`programming`, `compilers`, `rust`, `javascript`

### Optional submitter note

The article explains how one conformance corpus is shared by JavaScript, PHP, and
Rust implementations of a document-markup language, including what that corpus can
and cannot establish. It focuses on specification and parser-design lessons rather
than presenting a syntax tour.

Only use the note if the submission interface or community convention supports it.
An established Lobsters member should decide independently whether the article is
worth submitting.

## CommonMark forum discussion draft

### Title

Carve: testing a specified post-Markdown language across three engines

### Body

I have been working on Carve, a lightweight document-markup language influenced by
Markdown, Djot, Org mode, Creole, AsciiDoc, and CriticMarkup. I am sharing it here
because the design grew directly out of the same questions discussed in the Djot
threads: how much ambiguity and implementation variance should a lightweight
format tolerate, and which document features belong in the language itself?

Carve 0.1.5 now has a normative grammar and a shared conformance corpus consumed by
JavaScript, PHP, and Rust engines. It includes structured tables, captions,
cross-references, footnotes, math, attributes, admonitions, editorial markup, and an
extension contract. It is intentionally not Markdown-compatible, and the migration
documentation identifies delimiter collisions explicitly.

I am not proposing Carve as a CommonMark revision or claiming that switching away
from Markdown is cost-free. I would value criticism of the design boundaries,
especially cases where a construct still has two defensible readings or where the
specified behavior has merely displaced complexity.

- Playground: https://markup-carve.github.io/carve/playground
- Specification and corpus: https://github.com/markup-carve/carve
- Comparison: https://markup-carve.github.io/carve/comparison
- Divergence from Djot: https://markup-carve.github.io/carve/divergence-from-djot

I maintain the project and will keep the discussion focused on technical feedback.

## Existing awesome-list submissions

New awesome-list submissions are outside this first publication campaign. Carve is
already listed in Awesome Markdown through merged PR #113. Awesome PHP PR #1478 is
open and should simply be monitored. Awesome Markdown Alternatives PR #12 received
a scope rejection because the maintainer considers Carve part of the Markdown
family; do not nudge or resubmit it. The separate internal listing audit covers
other eligible directories such as Awesome Jekyll Plugins, MELPA, the Microsoft LSP
directory, and the Tree-sitter parser wiki.

## This Week in Rust article pitch

### Subject or draft entry

Three parsers, one result: building an executable specification for Carve

### Pitch

This article explains how the Rust implementation of Carve stays behaviorally
aligned with JavaScript and PHP implementations through one shared conformance
corpus. It covers rule-focused fixtures, cross-language implementation drift, and
the limits of what a green corpus proves. The article is intended as a transferable
parser-engineering case study rather than a routine project announcement.

Article: [URL]

Rust implementation: https://github.com/markup-carve/carve-rs

Specification and corpus: https://github.com/markup-carve/carve

Disclosure: I maintain Carve and wrote the article. [ADD AI-ASSISTANCE DISCLOSURE
IF REQUIRED BY THE ARTICLE'S AUTHORSHIP PROCESS.]

## PHP Weekly pitch

### Subject

Carve 0.1: one document-markup spec across PHP, JavaScript, and Rust

### Pitch

Carve PHP is a parser and renderer for the specified Carve document-markup language.
It supports structured document features, safe rendering controls, format conversion,
and framework integrations for Laravel, Symfony, Shopware, and WordPress. Its parser
runs the same conformance corpus as the JavaScript and Rust engines.

The linked article explains the cross-runtime testing design with a concrete parser
disagreement and resolution, rather than serving as a release changelog.

Article: [URL]

PHP package: https://github.com/markup-carve/carve-php

Playground: https://markup-carve.github.io/carve/playground

## Short social drafts

### Mastodon / Bluesky: article

What does it take for three markup parsers to mean the same thing?

Carve's JS, PHP, and Rust engines run one conformance corpus. I wrote about what the
fixtures catch, what they cannot prove, and how a second implementation exposes
assumptions hidden by the first.

[ARTICLE URL]

### Mastodon / Bluesky: playground

Carve 0.1.5 is a specified document-markup language with captions, cross-references,
rich tables, footnotes, math, safe rendering controls, and JS/PHP/Rust engines.

The playground needs no account or install. I would love examples that parse
surprisingly - or differently between engines.

[PLAYGROUND URL]

### LinkedIn

I have reached an unusual milestone with Carve: the language is now specified and
implemented across JavaScript, PHP, and Rust using one shared conformance corpus.

The new article is less about introducing syntax and more about an engineering
question: how do you prevent “compatible implementations” from becoming three
similar but distinct languages?

It covers the fixture design, the ambiguities that only become visible during a
second implementation, and the limits of corpus-based conformance.

[ARTICLE URL]

## Review checklist

### Editorial

- [ ] Choose the canonical article title.
- [ ] Add one real divergence example to the article; do not publish it abstractly.
- [ ] Confirm whether “three implementations” or “three engines” is the preferred
  term.
- [ ] Decide whether the first-person voice should identify the maintainer by name.
- [ ] Replace every bracketed placeholder.
- [ ] Verify every compatibility and security claim against current documentation.
- [ ] Add an authorship/AI-assistance disclosure wherever the receiving publication
  requires one.

### Launch readiness

- [ ] Test the playground in a private browser and on mobile.
- [ ] Confirm all three install commands from clean environments.
- [ ] Prepare an Open Graph image and a short screen recording.
- [ ] Ensure the landing page states the pre-1.0 policy near the install action.
- [ ] Decide who will monitor and answer launch-day comments.
- [ ] Define the desired feedback and record baseline traffic/install metrics.

### Community safety

- [ ] Re-read each community's rules on the day of submission.
- [ ] Do not ask for votes, stars, or coordinated engagement.
- [ ] Disclose project affiliation.
- [ ] Do not post the same story to several subreddits simultaneously.
- [ ] Do not submit to a curated list unless every written threshold is met.
