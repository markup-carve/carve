---
title: Include files
description: Bring another Carve or text file into a document when the processor supports file inclusion.
---

# Include Files

An include directive refers to another file. The host supplies a resolver and an allowed root; a plain render without access to the file cannot expand it. See [0.2 includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md) for path, selection, failure, and security rules.

In a handbook file, <code>&#123;&#123; chapter.crv &#125;&#125;</code> includes another source file when a resolver is configured.

A directive can select a section by fragment, lines with `@lines`, or a named region with `@region`. It can also request code presentation and heading shifts. For exact option spelling and combination rules, use [selection, transforms and mode](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md#selection-transforms-and-mode).

The CLI enables includes for `render`, `ast`, `lint`, and `diagnostics` by default when the resolver is available. Use `--include-root` to set containment, or `--no-includes` to keep directives unexpanded. `fmt` does not expand them. An include report records dependencies for a watcher. See [tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#input-and-output).

To flatten a document into one file, run `carve flatten handbook.crv`. It writes Carve source with every include expanded, so the result needs no resolver. It fails instead of writing when an include does not resolve, or when the flattened file would render differently, as when two included files define the same footnote or link reference key. `carve fmt` keeps each include line as written.

When a source file moves, check its relative paths, heading references, and selected region names. Failed resolution is diagnostic information; it must not be mistaken for successfully included content.
