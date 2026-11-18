---
description: How 0.2 performance will be measured.
---

# Performance

The 0.2 reference engine and specification are still changing. The 0.1 throughput figures previously published here used different syntax and implementations, so they are not 0.2 results. New numbers will follow a 0.2 benchmark rerun.

## Benchmark method

Measure the same valid 0.2 source across implementations at the same spec pin. Record the source size in bytes, engine commit, runtime version, machine, command or API used, warmup, trial count and summary statistic. Keep process startup separate from in-process render time. Measure parse, HTML render and canonical formatting separately. For import, use the same HTML source and importer options.

For growth checks, use several input sizes and report both elapsed time and output agreement with the [0.2 corpus](./conformance). A fast renderer that produces a different result is not a comparable implementation. The [writer's work bound](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#the-writer-and-its-two-gates) and the [specified limits](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/limits.json) are separate conformance requirements, not throughput claims.

Results from released 0.1 engines remain useful only as 0.1 history. See [carve-bench](https://github.com/markup-carve/carve-bench) for benchmark harness work.
