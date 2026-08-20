---
layout: home

hero:
  name: Carve
  text: A post-Markdown markup language
  tagline: Visual mnemonics, human-centered design — markup you can feel.
  image:
    src: /logo.svg
    alt: Carve logo
  actions:
    - theme: brand
      text: Try Carve →
      link: /playground
    - theme: alt
      text: Get Started
      link: /get-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/markup-carve

features:
  - title: Visual Mnemonics
    details: "/italic/ slashes lean, *bold* asterisks are heavy, _underline_ sits below, ~strikethrough~ runs through. Syntax that looks like its output."
  - title: Linear-Time Rigor
    details: "Djot-style linear-time parsing with no backtracking and unambiguous rules (Djot is the markup Carve builds on), extended with captions, abbreviations, and social conventions."
  - title: Ten-Second Rule
    details: Learnable in 10 seconds for basic use. Memorable after 10 days without practice. Unambiguous within 10 characters of context.
  - title: Interactive Online, Readable Offline
    details: "Built for the interactive web first — diagrams, math, charts and tabs hydrate into rich output online. With no JavaScript every block degrades to clean semantic HTML: a Mermaid fence still shows its source, <details> stays native, tables stay tables."
  - title: Captions Everywhere
    details: One ^ prefix captions images, blockquotes, tables, listings, equations and composite figure groups — emitting semantic figure / figcaption / caption HTML.
  - title: Friendly Tables
    details: "|= for headers, ^ for rowspan, < for colspan, + for multi-line cells. No separator row required."
  - title: Built-in Extensions
    details: ":type[content]{attrs} for video embeds and the rest of the handler family. Keyboard hints and the other semantic spans are core attributes instead — [Tab]{kbd}. @mentions and #tags as you'd expect from social platforms."
  - title: Safe With Untrusted Input
    details: "Always-on URL-scheme and attribute hardening, Trojan-Source stripping in presentation targets, and linear-time DoS limits neutralize the common Markdown attack classes with no separate sanitizer. Canonical Carve preserves source and warns through lint. Raw HTML passthrough is the one switch you own: on by default, off with a single flag or a safe mode. Carve never executes embedded code (unlike MDX)."
description: Carve is a post-Markdown markup language with visual mnemonics, a formal grammar, and safe-by-default rendering.
---

## What it looks like

Emphasis you can read at a glance - slashes lean, asterisks are heavy,
underscores sit below, tildes run through:

```carve
/italic/  *bold*  _underline_  ~strikethrough~  =highlight=

H{,2,}O and E=mc{^2^}
```

Tables without a separator row. `|=` marks a header cell, `|=>` aligns that
column right, a bare `|>` aligns a single body cell, and one `^` line captions
the whole thing:

```carve
|= Fruit  |=> Price |
| Apple    | $1      |
| Pear     | $2      |
|~ Total  |< $3     |
^ Table 1: no separator row needed
```

The same `^` captions an image or attributes a quote:

```carve
![Apollo 11](apollo.jpg)
^ Figure 1: first moon landing

> Stay hungry, stay foolish.
^ Steve Jobs
```

Abbreviations expand wherever the word appears, defined once anywhere in the
document:

```carve
The HTML spec is essential reading.

*[HTML]: HyperText Markup Language
```

Plus the conventions you already type - mentions, tags, and semantic spans:

```carve
Hey @alice, see #release-1.0.

Press [Tab]{kbd} to indent.
```

Every construct is on the [cheat sheet](./cheatsheet), and every one of them is
pinned to exact HTML in the [examples](./examples).

## Status

**Carve 0.1 is specified and shipping.** Tier-1 core and Tier-2 standard
extensions are normative and stable; Tier-3 app-level extensions ship but evolve
(see [Versioning](./versioning)). Conformance is pinned by 1341 corpus examples
with exact HTML output, and the three reference engines - carve-js (TypeScript),
carve-php, and carve-rs - all run the same corpus. Where the corpus pins a rule
ahead of an engine, the window is declared on the
[implementation comparison](./implementation-comparison) page rather than left
for a reader to discover.
Pre-1.0, a minor release may still change the grammar.

Reference material covers the normative [grammar](./grammar) and
[extensions contract](./extensions), the [security model](./security), the
[technical rationale](./technical-rationale), [parsing ambiguities](./parsing-ambiguities),
[native features](./native-features-analysis), and the
[broader markup landscape](./markup-languages). The [Case Study](./case-study/)
records the original design research the language grew out of; it is history,
not the normative spec.

Looking for a parser, editor plugin, or framework integration? See the [Ecosystem](./ecosystem). Want to write your own? Start with [Build Your Own Implementation](./implementing-carve).

**File extension:** `.crv`

## Influences

- **[Djot](https://djot.net/)** (John MacFarlane) — rigorous parsing, attributes, foundation
- **Org-mode** — `/italic/` syntax, TODO states
- **Creole** — `|=` table headers
- **AsciiDoc** — admonitions, document structure
- **CriticMarkup** — editorial annotations
