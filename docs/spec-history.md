---
title: Specification decision history
description: Retired readings and compatibility evidence kept outside the current normative rules.
---

# Specification decision history

The normative grammar states the current language. This page keeps the history
needed to understand source-compatibility changes without making readers walk
through retired rules before finding the active one.

## Colon fences

The original prose said a wider bare fence could close a shorter opener and
that equal-width typed fences could not nest. The formal guard and all engines
instead used exact-width closing, while a typed equal-width line opened a nested
container. The exact-width rule became normative in carve#770.

The same prose treated a bare opener without a later closer as literal text.
That conflicted with the general container rule and with all engines. Bare and
typed unclosed containers now both close with their host, with end of input as
the top-level case. The bare form is pinned by carve#1717.

One copy of the retired literal reading survived in the nested-list guidance.
It claimed an unclosed fence inside an item degraded and exposed its marker
lines as an ordinary nested list. The host-closing rule has no such exception:
the nested list remains the container body, with or without an explicit closer.
That correction is pinned by carve#1722.

## Container columns

Carve originally described list items, definition bodies and footnote bodies
with separate indentation rules. The current model uses one minimum content
column, one authored local block base, and the innermost eligible container as
owner. The compatibility measurements remain in the experiment reports; the
active rule is PART 1 S4 and PART 9 §24.
