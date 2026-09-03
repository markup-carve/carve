---
description: Choose a Carve implementation by runtime, output formats, integrations, and tested compatibility.
---

# Compare implementations

Carve has reference implementations for JavaScript, Rust, and PHP, plus a
WebAssembly package for browsers and other runtimes. They share the core syntax
and expected output; choose primarily by where your application runs and which
integration it needs.

For exact test runs, corpus accounting, timing methodology, and maintainer
commands, see the [comparison methodology](./implementation-comparison-methodology).

## Quick choice

| Implementation | Best fit | Install and API |
|---|---|---|
| **carve-js** | JavaScript and TypeScript applications, Node-based tooling, and browser bundlers | [carve-js documentation](https://github.com/markup-carve/carve-js) |
| **carve-rs** | Rust applications, native command-line tools, and performance-sensitive services | [carve-rs documentation](https://github.com/markup-carve/carve-rs) |
| **carve-php** | PHP applications, server rendering, and PHP editor integrations | [carve-php documentation](https://github.com/markup-carve/carve-php) |
| **carve-wasm** | Browser or non-Rust runtimes that can host WebAssembly | [carve-wasm documentation](https://github.com/markup-carve/carve-wasm) |

Start with [Get Started](./get-started) for installation examples. The broader
[ecosystem page](./ecosystem) lists bindings, editors, and conversion tools.

## Shared capabilities

The three reference engines support the same core language and are checked
against shared expected results. Their common surface includes:

- parsing Carve and rendering HTML, Markdown, plain text, and ANSI output;
- standard formatting back to Carve;
- parsed document JSON;
- built-in safety requirements;
- core syntax and the shared optional-feature tests;
- diagnostics for unsupported or degraded operations.

A shared language contract does not require identical package names or
framework adapters. Consult an implementation’s own documentation for its
language-native API.

## Output formats

HTML, Markdown, plain text, ANSI, and canonical Carve output are shared by the
three reference engines. If a target format cannot express a Carve feature,
the renderer should follow the [graceful-degradation rules](./graceful-degradation)
and report meaningful loss where the API provides diagnostics.

For DOCX, LaTeX, Typst, EPUB, and other publishing formats, use a tool described
in [Format conversion](./format-bridges).

## Optional features

Standard optional features are designed to behave consistently when enabled,
but registration uses each language’s normal API style. Application extensions
may exist in only one ecosystem. Check [Optional features and
extensions](./extensions) before assuming that a host-specific feature is
portable.

## Compatibility expectations

Use the latest compatible release of your chosen implementation. A release may
temporarily trail a newly accepted language rule even when its development
branch has already caught up. For a feature near a release boundary:

1. check the implementation’s release notes;
2. test a representative document in your deployment version; and
3. consult the technical snapshot if exact cross-engine status matters.

The [comparison methodology](./implementation-comparison-methodology) records
the dated evidence behind conformance claims. Its counts and commit identifiers
are measurements, not a stable user-facing feature list.

## Performance

Runtime startup, process invocation, and embedding strategy often matter more
than parser throughput for small documents. Compare implementations inside your
own application rather than treating CLI timings from another machine as a
benchmark. See [Performance](./performance) for the measurements Carve does
publish and how to interpret them.

## For maintainers

The [technical comparison and methodology](./implementation-comparison-methodology)
contains the current snapshot, test commands, target rules, round-trip and
generated-document checks, pin drift, and corpus bookkeeping.
