## The writer spells looseness only where a blank line cannot

The other half of L7, and the load-bearing half. `loose` is legal on a container
the blank lines already loosened - it is a no-op there, deliberately, so a
producer that always emits it stays simple. What the CANONICAL WRITER does is a
separate question, and the answer is that it emits the key only where the
blank-line spelling cannot express the looseness. PART 12 section 15's writer
"retains `header-rows` / `footer-rows` when they are present" rather than
deriving them onto every table, and PART 11 section 2 spends a mark only where
omitting it would change the re-parsed document; on the list below the blank line
already says loose, so the key would be idle by exactly that test.

The alternative - emit it on every loose container - would rewrite a large share
of this corpus and of every document anyone has written, and would gain nothing.
So the rule needs a fixture that goes red when a writer starts decorating
everything, which is what the `.fmt` sidecar beside this pair is: the HTML is
identical under both spellings, so no HTML fixture can see the difference.

::: compare

```carve
- alpha

- beta
```

```html
<ul>
  <li><p>alpha</p></li>
  <li><p>beta</p></li>
</ul>
```

:::

**THE ITEM COUNT IS NOT THE TEST**, and this is where an implementation of the
rule above goes wrong. "Two or more items already say it" is true, so the
tempting converse - fewer than two items, therefore decorate - looks like the
same rule read backwards. It is not: a list with one item can be loose because
the blank line sits INSIDE that item, and then the blank-line spelling did
express the looseness after all. The list below is that shape. So is corpus
document `05-lists-11`, which is a one-item ordered list whose item holds two
paragraphs - a writer keyed on the item count rewrites it, and
`parse(fmt(x)) == parse(x)` fails on a document that was never lossy.

The decidable test is a RE-PARSE, over the document rather than over the render:
write the body without the key, read it back, and emit the key only where the
container's own looseness field did not survive the trip. The item count is
sound as a shortcut in ONE direction only - two or more items always re-parse
loose, so the extra read can be skipped there, which keeps it off almost every
list in this corpus.

::: compare

```carve
- alpha

  beta
```

```html
<ul>
  <li><p>alpha</p>
    <p>beta</p>
  </li>
</ul>
```

:::
