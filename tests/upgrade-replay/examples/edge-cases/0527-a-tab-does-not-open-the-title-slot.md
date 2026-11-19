## A tab does not open the title slot

`link_title` spells its padding `space`. The slot sits after the first
non-whitespace character of the line, where a tab carries no syntax (PART 7), so
a tab leaves the destination closed and the whole line is prose. Nothing else
about the line changes: the quotes are ordinary text and smart typography reads
them. `image_title = link_title`, so an image refuses it on the same terms.

::: compare

`````carve
[a](/u	"t")
`````

`````html
<p>[a](/u	“t”)</p>
`````

:::

::: compare

`````carve
![a](/i	"t")
`````

`````html
<p>![a](/i	“t”)</p>
`````

:::

A single space is the spelling that opens it.

::: compare

`````carve
[a](/u "t")
`````

`````html
<p><a href="/u" title="t">a</a></p>
`````

:::
