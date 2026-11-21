---
description: How to compare Carve 0.2 implementations against one spec pin.
---

# Implementation comparison methodology

This page describes a reproducible 0.2 comparison. The [implementation comparison](./implementation-comparison) summarizes the current choices. The old fixture counts and target comparisons belonged to 0.1; they are archived in the [0.1 version of this page](https://github.com/markup-carve/carve/blob/main/docs/implementation-comparison-methodology.md).

## Pin the contract

Record the spec commit from `next2`, each engine commit, runtime version and enabled options. Compare an engine only against the [0.2 corpus](https://github.com/markup-carve/carve/blob/next2/spec/0.2/conformance/README.md) at that same spec pin. A case marked unverified has hand-written expected output from the clause, so a disagreement calls for reading its cited clause before assigning a defect.

## Count by operation

Report the number attempted, passed, mismatched and refused for each operation: render, write, lint, parse, include, import, tree reading and CLI. A single total hides missing surfaces. Compare HTML and canonical source byte for byte. Compare trees under [AST equality](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#equality), and compare positions separately when claimed. Compare diagnostic codes, channels, severities, ranges and paths according to the [tooling contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#diagnostics-and-reports). The wording of a diagnostic message is not a cross-engine equality claim.

## Classify differences

For each mismatch, keep its case ID, source or HTML input, options, expected result, actual result and deciding `C2-` clause. Distinguish an engine difference from an internally inconsistent expected case. A declared gap remains visible in the report and counts as a mismatch. A corpus pass is evidence only for its cases, options and operations.

## Timing

Time a separate, identical workload after correctness checks. Record whether startup is included. For in-process timings, warm the engine and give the trial count and statistic; for CLI timings, include process startup and label it. The [performance page](./performance) describes the 0.2 benchmark record. No 0.1 timing or pass rate is a 0.2 measurement.
