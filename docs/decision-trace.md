---
description: Tracing parser decisions while implementing Carve 0.2.
---

# Decision trace

A trace can help locate the first parsing decision behind an output difference. Carve 0.2 does not specify the 0.1 JSON-lines trace schema, step IDs or `carve trace` command. The 0.2 [tooling command list](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#commands) defines the portable CLI surface.

For a 0.2 mismatch, report the [conformance case ID](https://github.com/markup-carve/carve/blob/next2/spec/0.2/conformance/README.md), input, options, expected output, actual output and the deciding `C2-` clause. A local engine trace is useful for diagnosis, but its fields and step names are implementation details. The [block ownership rules](./ownership-procedure) and [AST positions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#positions) give portable points of comparison.

The former `INPUT`, `S1` to `S5` and `T` trace format remains a [0.1 tool](https://github.com/markup-carve/carve/blob/main/resources/decision-trace-schema.json). Do not compare its rule IDs with a 0.2 parser.
