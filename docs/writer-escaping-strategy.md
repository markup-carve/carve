---
title: Writer escaping strategy
description: One way to implement the canonical writer's contextual escape rule.
---

# Writer escaping strategy

[PART 11 §2](./grammar) pins the bytes the canonical writer emits. This page describes one way to decide whether a candidate character needs an escape. An implementation can use another method if it produces the same bytes. PART 11 §2b limits a conservative fallback to the smallest failing unit.

A static character table cannot make this decision. `[` is literal on its own but opens a link in `[a](b)`. `(` is literal in `[a] (b)` but opens a destination in `[a](b)`. `^` is literal before a space at column zero but opens a footnote in `^[note]`. `-` is literal inside a word but can open a list at the start of a line. `_` opens emphasis only when a closer follows. Escaping these characters everywhere would violate §2 when the escape changes nothing.

## Trial forms

PART 11 §5 names the unconditional and candidate sets. Build two trial outputs:

1. In the minimal form, escape only the unconditional set.
2. In the conservative form, escape the unconditional and candidate sets.

A lone bracket inside a bracketed construct, or a `(` that would open a destination, belongs to the unconditional set. It appears escaped in both trials.

If the trials are byte-identical, use either. Otherwise, parse both complete documents and compare their trees, ignoring source positions and key order. Comparing an isolated line loses reference and footnote definitions. Compare the two emitted forms with each other, since permitted writer spellings can re-parse to trees that differ from the original while rendering identically.

If the trial parses agree, use the minimal form. If they differ, use the conservative form only for the smallest failing inline run or block, then re-parse the combined output. Within a unit left conservative, try each opener occurrence bare and keep it bare when the comparison still holds. A failure in one occurrence need not force escapes on the others.

A bounded search may stop early. Occurrences it has not resolved stay escaped under the §2b fallback. After changing selected units, re-parse the result and compare it with the conservative form's re-parse. The conservative trial is a starting point, not proof that the final mixture reads back correctly.

This procedure is guidance. The observable requirements remain the escape test in §2, the fallback scope in §2b, and the character sets in §5.
