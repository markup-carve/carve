# Lint parity harness

`scripts/lint-parity.mjs` lints seeded generated inputs with carve-js, carve-php and carve-rs and reports
every rule on which the engines disagree. Each input runs twice: in core mode and with the citations and
glossary extensions (`carve.cite`, `carve.references`, `carve.term`, `carve.glossary`).

## Running it

```sh
export CARVE_JS_DIR=../carve-js         # built: npm ci && npm run build (reads dist/)
export CARVE_PHP_DIR=../carve-php       # composer install
export CARVE_RS_DIR=../carve-rs         # the driver is built from it with cargo build --release
node scripts/lint-parity.mjs --seed 7 --count 5000 --out lint-parity-7.json
```

The engine directories default to `engines/carve-js`, `engines/carve-php` and `engines/carve-rs`.
`CARVE_RS_LINT_BIN` skips the Rust build and runs an already built `carve-lint-parity` binary.

Options:

- `--seed N` and `--count N`: the generator seed and the number of inputs. The same seed gives the same
  inputs.
- `--modes core,ext`: which modes to run.
- `--cases file.json`: lint a JSON array of sources instead of generated inputs.
- `--samples N`: how many inputs per signature to minimize (default 6). `--no-minimize` skips it.
- `--out file.json`: write the full report.

## What it compares

Per input and rule, findings are compared in three steps: the number of findings, then their ranges
(`startOffset`, `endOffset`), then their messages. The first step that differs gives the difference
kind (`count`, `range` or `message`). Its pattern partitions the engines by result, so `js=php<rs` means
carve-js and carve-php agree and carve-rs reports more.

A signature is a rule, a kind and a pattern. The shortest inputs of each signature are minimized by
greedy line deletion while the signature still holds, and a cause class is a signature plus the
minimized input with its words collapsed. Two classes with one signature usually still share a cause;
read the examples before filing.

## The generator

Every line shape in `spec/0.2/data/line-shapes.json` has a producer. Blocks nest in quotes, bullet and
ordered items, descriptions, footnotes and divs to depth 3. Lines are then shifted by spaces or tabs,
lose a container prefix (lazy lines) or the space after a marker, and blocks are joined with or without
a blank line. Some inputs start with frontmatter. Inputs stay ASCII, so offsets agree across engines.
