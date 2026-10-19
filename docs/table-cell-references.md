---
title: Table cell references
description: Insert a value from a named Carve table into prose or inline code.
---

# Table cell references

Give a table an ID, then use `@{#id[row][column]}` to insert one of its values.
The row and column can be positive 1-based numbers or quoted names. A quoted
row name comes from the first column by default. A quoted column name comes
from the final leading header row.

````carve
{table #sales}
```csv
Quarter,Revenue
Q1,120
Q2,150
```

Q2 revenue was @{#sales["Q2"]["Revenue"]}.
````

The last sentence renders as “Q2 revenue was 150.” The same reference works
with a pipe table carrying `{#sales}`. It also works after an identified table
has been brought into the document through an include. The reference never
reads a file by itself.

## Row names and positions

Use `row-key` when the column that identifies rows is not the first one:

````carve
{table #sales row-key=Quarter}
```csv
Revenue,Quarter
120,Q1
150,Q2
```
````

Now `@{#sales["Q2"]["Revenue"]}` still selects `150`. Key values must be
nonempty and unique. Names match exactly, including case and whitespace.
Without a useful key or header, `@{#sales[2][1]}` selects the second body row's
first column. Numbered positions can change meaning when rows or columns move.

## Formatting the result

The value is inserted after Carve parses the surrounding inline markup:

```carve
*Q2 revenue: @{#sales["Q2"]["Revenue"]}*
Q2 revenue: @{#sales["Q2"]["Revenue"]}{code}
```

The first line renders in bold. The second displays the value as inline code.
The value itself is text, not new Carve markup or HTML.

A selector inside backticks or a code fence is shown literally. Those contexts
remain verbatim. A missing table, row or column leaves the selector visible and
produces a diagnostic; strict validation fails. An authored empty cell is a
valid empty value.
