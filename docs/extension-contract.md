# Extension contract

This page maps host implementations to the provisional [Carve 0.2 extension specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md). The extension interface and standard catalog are not frozen with the core. Pin the spec and reference engine revision when building against them.

## Registration and claims

Register a qualified name, exact version, matcher, prop schema, and ordered named slots. Inline matchers claim `:name[content]`; block matchers claim a named div or code fence. A claim runs after core parsing and cannot add a sigil or delimiter. Two enabled matchers cannot claim the same core node. Unclaimed source stays core content. See [registration and matching](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#registration-and-matching).

## Transform and carry

A transform maps one claimed core node to one extension node of the same inline or block role. It reads only that node and descendants. A qualified node carries its name, version, declared props and slots, a same-role core fallback, and optionally payload and canonical source record. The fallback contains no extension nodes. Unknown optional extensions preserve their declarations and render the fallback; unknown required extensions are refused. See [transformation and carriage](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#transformation-and-carriage) and [AST extension shape](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources).

## Resolve, render, and write

Resolution chooses the extension view when a renderer is registered and the profile allows it; otherwise it chooses the fallback. A renderer receives the resolved node and host helpers. Its HTML string is trusted host output. A throwing transform leaves the claimed core node; a throwing renderer uses an unresolved fallback, with a diagnostic. A source record lets the canonical writer reproduce a claimable core spelling; otherwise it writes fallback and reports loss. See [rendering and equality](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#resolution-rendering-and-equality) and [writer rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#canonical-forms-blocks).

## Standard tabs example

The optional tabs extension claims a `tabs` div containing titled `tab` divs. It declares `carve.tabs` and `carve.tab` version `1`. The fallback puts each title in a strong paragraph before its body. The static renderer emits radio controls, labels, and all panels. See [standard tabs](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#standard-extension-tabs).
