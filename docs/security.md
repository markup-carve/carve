---
description: How Carve treats untrusted source, raw HTML and URLs.
---

# Security

Carve 0.2 treats untrusted source as data. Bare HTML tags are escaped as text. Explicit raw HTML is disabled by default and requires `rawHtml: true` or `carve render --raw-html`. Only enable that option for trusted input and output contexts. See [raw HTML rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#code-and-raw-content) and [options](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

## URL and attribute policy

A normal link is subject to the URL policy when rendered:

```carve
See [the guide](/guide).
```

The HTML renderer checks URL-valued attributes against `urlPolicy`. The default denies dangerous schemes, and there is no option that turns scheme checking off. The policy also covers URL sinks in extension output when trusted extension code uses the host helpers. CSS values and attributes have their own hardening rules. See [HTML options and URL policy](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options) and [`url-policy.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/url-policy.json).

The renderer omits bidirectional override and isolate controls from displayed text and code while preserving them in the AST and canonical source. The `bidi-control-in-source` lint rule points authors to them. See [C2-H-172](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options) and [lint](./validation.md).

## Resource and host boundaries

Profiles bound input length and nesting; parser, AST reader, importer, include resolver, and extension reader have further limits in their respective contracts. Keep include roots within a trusted directory and use a resolver that enforces access policy. See [include security](https://github.com/markup-carve/carve/blob/next2/spec/0.2/includes.md) and [reader checks](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#reading-a-tree).

An extension renderer is trusted host code. Its returned HTML is inserted unchanged. Register only renderers you trust, use host escaping and URL helpers for dynamic values, and treat remote media or embeds as separate application decisions. See [extension rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#resolution-rendering-and-equality).

## Changed in 0.2

The old `--no-raw-html` and `--safe` behavior is now the default. Use `--raw-html` only when raw markup is required and allowed. The Markdown, plain text, and ANSI targets (`--to markdown`, `--to plain`, `--to ansi`) are export renderers whose output the specification does not define (C2-T-003). See [the upgrade guide](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#command-line-and-missing-features).

## Resource limits (denial of service)

The parser, AST reader, importer, include resolver, and profiles enforce separate bounds. A profile's input-size bound is checked before parsing. Keep the limits in the [0.2 data files](https://github.com/markup-carve/carve/tree/next2/spec/0.2/data) and the relevant contracts; do not replace them with the 0.1 limits.

## File inclusion

Includes require an explicit host resolver. A CLI include root limits the files the resolver may read. Review the [include contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/includes.md) when enabling expansion for untrusted documents.

## How Carve compares on security

Carve 0.2's default HTML output escapes bare tags, turns raw HTML off, and applies a URL scheme policy. These rules describe Carve's output; a site still controls its own extension renderers, links, media, and HTML embedding policy.
