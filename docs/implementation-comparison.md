---
description: Current implementation choices for Carve 0.2.
---

# Compare implementations

Carve has reference implementations for JavaScript, Rust and PHP, plus a WebAssembly package for browsers and other runtimes. They share the core syntax and expected output, so choose mainly by where your application runs and which integration it needs.

Carve 0.2 is under development. [`carve-js` on `main`](https://github.com/markup-carve/carve-js/tree/main) is the reference implementation for the candidate specification. The released JavaScript, PHP, Rust and WebAssembly packages implement 0.1. Their 0.1 conformance and speed measurements do not establish 0.2 support.

For exact test runs, corpus accounting, timing method and maintainer commands, see the [comparison methodology](./implementation-comparison-methodology).

## Quick choice

| Implementation | Best fit | Install and API |
|---|---|---|
| **carve-js** | JavaScript and TypeScript applications, Node-based tooling and browser bundlers | [carve-js documentation](https://github.com/markup-carve/carve-js) |
| **carve-rs** | Rust applications, native command-line tools and performance-sensitive services | [carve-rs documentation](https://github.com/markup-carve/carve-rs) |
| **carve-php** | PHP applications, server rendering and PHP editor integrations | [carve-php documentation](https://github.com/markup-carve/carve-php) |
| **carve-wasm** | Browser or non-Rust runtimes that can host WebAssembly, built on carve-rs | [carve-wasm documentation](https://github.com/markup-carve/carve-wasm) |

Start with [Get Started](./get-started) for installation examples. The [ecosystem page](./ecosystem) lists bindings, editors and conversion tools.

## Which version to use today

| Need | Current path |
|---|---|
| Parse, render, format or lint 0.2 | The `carve-js` `main` branch and its `carve` command |
| Implement another language | Pin the [0.2 spec](./grammar) and run its [shared corpus](./conformance) |
| Migrate 0.1 documents | Read [Upgrading from 0.1](./upgrade-0-2) and test the reference engine's `upgrade` command |
| Use a released implementation | Use the [0.1 site](https://markup-carve.github.io/carve/) and a released 0.1 engine |

## Shared capabilities

Every 0.2 engine offers the same library calls and the same `carve` program, with the same flags, exit codes and reports. Their common surface includes:

- parsing Carve and rendering HTML;
- canonical formatting back to Carve with `carve fmt`, and writing Carve from a tree;
- lint, with the same rule ids, severities and meanings;
- AST 2.0 JSON, reading and writing, and `carve migrate-ast` for stored 1.x trees;
- HTML import with `carve import --from html`;
- includes, with `carve flatten` to expand them;
- the built-in URL policy and rendering profiles;
- diagnostics for refused, lossy or degraded operations.

A shared language contract does not require identical package names or framework adapters. Each engine spells a call, a result field and an error by the conventions of its language. Consult an implementation's own documentation for its language-native API.

## Output formats

The 0.2 specification requires HTML, canonical Carve source and AST 2.0. Every engine also offers Markdown, plain text and ANSI export through its library and `carve render --to markdown`, `--to plain` and `--to ansi`, but their output is engine behavior outside the specification. Do not rely on two engines writing the same Markdown or plain text.

If an output cannot express a Carve feature, the renderer follows the [graceful-degradation rules](./graceful-degradation) and reports the loss where the API provides diagnostics.

For importing, the common 0.2 contract is HTML import. The JavaScript reference engine also offers Markdown, GFM and Djot importers outside the specification. For DOCX, LaTeX, Typst, EPUB and other publishing formats, use a tool described in [Format conversion](./format-bridges).

## Optional features

Standard extensions are designed to behave the same in every engine when enabled, but registration uses each language's normal API style. In 0.2 the extension mechanism is provisional: its interfaces may still change in a 0.2.x release. Application extensions may exist in only one ecosystem. Check [Optional features and extensions](./extensions) before assuming that a host-specific feature is portable.

## Compatibility expectations

Use the latest compatible release of your chosen implementation. A release may trail a newly accepted language rule even when its development branch has already caught up. For a feature near a release boundary:

1. check the implementation's release notes;
2. test a representative document in your deployment version; and
3. consult the [comparison methodology](./implementation-comparison-methodology) if exact cross-engine status matters.

### Measured 0.2 readiness

On November 20, 2026, at 08:44 UTC, the 0.2 readiness gate replayed the 0.2 corpus through the engine `next2` heads below. Each cell is passing cases over total cases; no case failed or was unsupported.

| Engine | Commit | Clause cases | Examples | Trees | Extensions |
|---|---|---:|---:|---:|---:|
| carve-js | `1acf5564` | 1347/1347 | 657/657 | 705/705 | 94/94 |
| carve-php | `9766b867` | 1347/1347 | 657/657 | 705/705 | 94/94 |
| carve-rs | `19f0453d` | 1347/1347 | 657/657 | 705/705 | 94/94 |

The corpus has grown since that run, and the rulings of November 21 reopened parts of the candidate, so treat the table as dated evidence for those cases only.

### Measured on 0.1 engines

On October 25, 2026, the pinned 0.1 engines each passed 3,249 scored core fixtures from 3,056 documents and 69 optional cases of the 0.1 corpus. These count-only runs checked expected output on scored targets; they did not compare unscored targets. They are 0.1 results and say nothing about 0.2.

## Performance

Runtime startup, process invocation and embedding strategy often matter more than parser throughput for small documents. Compare implementations inside your own application rather than treating CLI timings from another machine as a benchmark. See [Performance](./performance) for the measurements Carve publishes, which are 0.1 measurements until a 0.2 benchmark rerun, and how to read them.

**Specification (external):** [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md) (C2-T-001 to C2-T-005), [Writer, out of scope](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#out-of-scope), [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md), [Status, engine readiness](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md#engine-readiness-20-november-2026).
