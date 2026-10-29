## A collapsed reference is matched by the label the author wrote

`[label][]` resolves against the definition whose label is that BRACKET TEXT, whitespace-collapsed - the same spelling the definition line registers. The rendered text is a different string as soon as the label carries markup, and keying on it inverts the rule in both directions: the definition that names the label stops resolving, and a plain definition the author never referenced starts.

This engine-visible pair is what nothing pinned. carve-php stripped `_ * ~ ^ + = { } [ ] ` ` from every collapsed label and got both halves backwards (carve-php#768); the executable spec keyed on the rendered text and got the same two answers wrong (carve#648). Three implementations agreed all along and no case could tell.

::: compare

```carve
[*bold*]: /x

see [*bold*][]
```

```html
<p>see <a href="/x"><strong>bold</strong></a></p>
```

:::

The inverse: a decorated label does not reach a plain definition, because `[bold]` is not the label that was written. Unresolved, the construct renders as the SOURCE the author typed - `[*bold*][]`, markers and all - not as the bracket content re-rendered. The executable spec emitted the rendered form here (`[<strong>bold</strong>][]`), which drops the markers that identify the construct while keeping the brackets that make it look like one.

::: compare

```carve
[bold]: /x

see [*bold*][]
```

```html
<p>see [*bold*][]</p>
```

:::
