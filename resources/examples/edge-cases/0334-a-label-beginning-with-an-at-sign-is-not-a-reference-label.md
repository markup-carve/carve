## A label beginning with an at sign is not a reference label

`reference_label = (character - ']' - '@'), {character - ']'}` subtracts `@` from the first position, and that exclusion is what keeps `[@key]` free for citations. So a bracket pair whose content starts with `@` was never spelling a label, and the label slot of a reference link is no exception to it: the slot does not match, the production does not match, and the construct is not a reference link. The bracket run stays literal text, exactly as any other malformed reference does (carve#1302).

::: compare

```carve
[t][@a]
```

```html
<p>[t][@a]</p>
```

:::

The image spelling reads the same `reference_label` at the same slot, so it gets the same answer rather than a parallel rule.

::: compare

```carve
![t][@a]
```

```html
<p>![t][@a]</p>
```

:::

The control is what makes this a rule rather than a breakage: `@` at the first position ALREADY means citation, so it cannot also mean label, and an implementation that made the slot accept `@` would have to take that spelling away from citations to do it. A citation's rendering cannot be stated here - the construct is Tier-2 and the executable spec refuses it (carve#798) - so `43-citations-at-label-in-reference-position` in tests/corpus-optional carries the other half: with the Citations extension on, both spellings above are still literal text while a `[@a]` beside them resolves to a citation.

The run declines as ONE construct and is restored as one, so the `@a` inside it is text and nothing else. A rescan would read `[t][@a]` as a `[t][` run, a mention and a `]`, and with the extension on it would read the now tail-less `[@a]` as a citation - which is why the optional control renders both spellings literally on the far side of the switch.

At the HTML layer these rows cannot separate "not a reference label" from "a label nothing defines": a `@`-first label can never be defined, and a declining reference renders as its verbatim source either way. PART 12 §3a is where the readings would differ, all three engines publish an unresolved-reference node there, and the grammar clause records that without settling it.
