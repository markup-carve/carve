---
description: Import HTML into Carve, choose a fidelity mode, and review content that could not be represented exactly.
---

# Import HTML

Use HTML import when migrating existing content or accepting editor-produced
HTML. The importer returns Carve content plus diagnostics for anything it could
not preserve exactly.

For the element-by-element and implementer rules, read the
[HTML import contract](./html-import-contract).

## Basic workflow

1. Choose the import mode that matches how much you trust the HTML.
2. Import to Carve source or to a parsed document.
3. Review warnings, errors, and diagnostic codes that report changed content.
4. Render the result and check the structures important to your application.
5. Store the Carve source only after that review passes.

For a large migration, keep the diagnostic report with the source document so
later review can distinguish an accepted conversion from an unnoticed loss.

## Choose a mode

| Mode | Use it for | Behavior |
|---|---|---|
| **safe** | Untrusted or user-supplied HTML | Preserves supported content while applying the strictest safety policy |
| **semantic** | Typical migration and editor HTML | Prefers meaningful Carve constructs over exact presentation |
| **roundtrip** | HTML previously emitted by a Carve implementation | Uses Carve provenance to preserve more structure and reports what source cannot reproduce |

`safe` is the default and the right starting point for arbitrary input. Choose
`semantic` explicitly for trusted CMS or editor HTML when you want the
importer's semantic and CSS mappings. Choose `roundtrip` only for
Carve-produced HTML; it may retain otherwise unsupported markup as raw HTML and
is not safe for arbitrary input.

## Source and parsed-document results

Importers expose two useful forms:

- **Carve source** is what you store, edit, diff, or pass to another processor.
- **Parsed document JSON** is convenient for editor integrations and structural
  transforms.

Both represent the same imported document. If your workflow changes the parsed
document, serialize it with the canonical writer instead of assembling Carve
source by hand.

## What imports naturally

Common document HTML has direct Carve equivalents:

- headings, paragraphs, lists, block quotes, and code blocks;
- emphasis, links, images, and inline code;
- tables that fit Carve’s table model;
- figures and captions whose structure can be expressed in Carve;
- comments;
- semantic inline elements such as `kbd`, `abbr`, and `time`.

Attributes are preserved when Carve can carry them safely. Active content,
event handlers, unsafe URLs, and structure with no Carve equivalent may be
removed or represented less precisely, depending on the mode.

## Read the diagnostics

Each diagnostic has a `code`, `message`, and `severity` of `info`, `warning`, or
`error`. Applications should normally treat them as follows:

| Signal | Typical meaning | Suggested response |
|---|---|---|
| `info` | A visible but non-lossy normalization or preservation decision | Keep for audit or display when useful |
| `warning` | An element, attribute, table, or encoding could not be represented exactly | Review if the affected content matters |
| `error` | Unsafe content survived only because trusted round-trip behavior retained it, or another decision needs explicit attention | Do not publish without review |

Codes such as `element-dropped`, `element-unwrapped`, `attribute-dropped`, and
`table-degraded` tell you what changed. An exact import normally emits no
diagnostic for that content.

Diagnostics include a path to the affected imported node. Display that path or
translate it into an editor selection so reviewers can find the problem.

## Examples of expected degradation

- A visual-only wrapper may disappear while its text remains.
- Interactive HTML may become a static Carve container.
- A table structure richer than Carve’s model may be simplified.
- Unsupported active content may be dropped in safe mode.
- HTML-specific layout whitespace may not survive canonical formatting.

These outcomes are not necessarily errors. The important requirement is that a
meaningful change is reported rather than silently hidden.

## Security

HTML import is not permission to trust arbitrary HTML. Keep Carve’s built-in URL
and attribute protections enabled, use `safe` mode at untrusted boundaries, and
apply your normal rendered-HTML sanitization policy where arbitrary attributes
or raw HTML are allowed. See [Security](./security) for the deployment model.

## Verify a migration

Before running a bulk conversion, assemble a small representative set that
includes tables, figures, links, code, comments, and any application-specific
HTML. Compare:

1. the original rendered content;
2. the imported Carve source;
3. the diagnostic report; and
4. the rendered Carve result.

The [format conversion](./format-bridges) guide explains the same review process
when another document model is involved.

## Technical reference

The [HTML import contract](./html-import-contract) specifies element mapping,
canonical spelling, the relationship between source and parsed-document exits,
diagnostic ordering and paths, figures, tables, list tightness, whitespace,
resource limits, and the required API surface.
