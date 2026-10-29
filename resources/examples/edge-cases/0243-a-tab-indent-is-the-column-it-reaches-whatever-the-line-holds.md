## A tab indent is the column it reaches, whatever the line holds

§24 C1 makes indentation a column claim: a space advances one column, a tab advances to the next multiple of 4. `1. ` claims columns 0-2, so the item's content column is 3 and a tab reaches column 4 - one column PAST it, which is what four spaces reach too. Both spellings establish the same authored block base and open the quote.

The corpus pinned neither, so two engines read the tab as if it stopped at the content column and nested a block quote no space spelling of column 4 produces (carve-js#767, carve-php#890).

::: compare

```carve
1. a
	> quote
```

```html
<ol>
  <li>a
    <blockquote><p>quote</p></blockquote>
  </li>
</ol>
```

:::

At the content column itself it nests, which is the boundary the rule above is drawn against.

::: compare

```carve
1. a
   > quote
```

```html
<ol>
  <li>a
    <blockquote><p>quote</p></blockquote>
  </li>
</ol>
```

:::
