## A tab continues a list item just as two spaces do

The tab-stop rule that lets a tab reach a marker column applies to a list item's
CONTINUATION line as much as to its first. `- item` puts the content column at
2, and a following line indented with one tab reaches it exactly as two spaces
do, so both spellings are one paragraph inside the item.

Pinned because the two spellings are decided in different places and one engine
decides them differently. carve-js publishes no position for the paragraph or
any of its three inlines when the continuation is a TAB, and places all four
when it is two spaces or when the marker is `1.`; carve-rs and carve-php place
them either way and agree to the offset
([carve-js#712](https://github.com/markup-carve/carve-js/issues/712)). The HTML
is identical in all three, which is why nothing in this corpus could see it -
the divergence is entirely in PART 12 positions, which the pair below does not
express and `npm run ast:check` now does.

The tab spelling:

:::: compare

```carve
- item
	more

x
```

```html
<ul>
  <li>item
more</li>
</ul>
<p>x</p>
```

::::

The two-space spelling, which is the control: it is the same document, and the
engine that drops the positions above keeps them here.

:::: compare

```carve
- item
  more

x
```

```html
<ul>
  <li>item
more</li>
</ul>
<p>x</p>
```

::::
