## Mention and tag name boundaries

A mention or tag name runs over letters, digits, `_`, `-`, and *interior* dots (a dot followed by another name character, as in `@john.doe` or `#release-1.0`). A dot at the end of the run is sentence punctuation, not part of the name; other punctuation ends the name and stays literal (an apostrophe becomes a typographic quote).

::: compare

```carve
Ping @john-doe, @john_doe and @john.doe about #release-1.0 today.

Reach @john. That is @john's idea, @john!
```

```html
<p>Ping <span class="mention"><strong>@john-doe</strong></span>, <span class="mention"><strong>@john_doe</strong></span> and <span class="mention"><strong>@john.doe</strong></span> about <span class="tag"><strong>#release-1.0</strong></span> today.</p>
<p>Reach <span class="mention"><strong>@john</strong></span>. That is <span class="mention"><strong>@john</strong></span>’s idea, <span class="mention"><strong>@john</strong></span>!</p>
```

:::
