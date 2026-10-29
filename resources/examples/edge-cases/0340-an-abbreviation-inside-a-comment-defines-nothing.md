## An abbreviation inside a comment defines nothing

The abbreviation collector is a third pass again, and this is the one document in the group that has to sit at column 0: PART 12 §7 recognizes an abbreviation definition only as a direct child of the DOCUMENT, so an abbreviation written inside an item's comment is already not a definition for a reason that has nothing to do with the comment, and a document written that way could not tell the two reasons apart. At column 0 both reasons are live and only the comment is doing the work.

::: compare

```carve
%%%
*[HTML]: HyperText Markup Language
%%%

HTML here
```

```html
<p>HTML here</p>
```

:::

Its position makes it look like the link-reference case above, and the collector it exercises makes it a different document: carve-php reads the link-reference form of this shape correctly and defines the abbreviation anyway (markup-carve/carve-php#1349). An abbreviation is the worst of the three to leak, because the use site carries no bracket to give it away - the term is rewritten in running prose that never asked for it.
