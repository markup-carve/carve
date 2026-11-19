# Content profiles

A render profile limits which node types appear as their normal HTML form. The four 0.2 profile names are `full`, `article`, `comment`, and `minimal`. `full` is the default. The lists and limits are in [`url-policy.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/url-policy.json), and the behavior is in [C2-H-163 to C2-H-165](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

```sh
carve render --profile comment document.crv
```

The JavaScript API takes `profile: "comment"` in render options. A type denied by a profile degrades according to its node type; it is not removed by an arbitrary text filter. A profile also enforces its maximum input length before parsing and maximum nesting during rendering. `comment` adds `rel="nofollow ugc"` to links. The exact allowed types and limits come from the data file.

A link in the source stays semantic content when its HTML form degrades:

```carve
See [the guide](/guide).
```

Profiles and URL filtering are separate. Every profile applies the URL policy, and the policy has no off switch. A profile is not a replacement for turning raw HTML off: `rawHtml` is already false by default. See [URL policy](./security.md) and [HTML options](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

## Changed in 0.2

The 0.1 profile object and `profileBaseHost` option are gone. Pass one of the four profile names. The [JavaScript API upgrade table](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#javascript-api) maps the old options.

The 0.1 documentation used the following vocabulary with configurable allow and deny lists. It is retained here as a migration index for readers of older integrations and for the existing 0.1 schema check in this documentation build. It is not a list of the 0.2 profile options. Use the four 0.2 profile names and the node lists in [`url-policy.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/url-policy.json).

**Block:** `paragraph`, `heading`, `code_block`, `block_quote`, `list`,
`list_item`, `table`, `table_row`, `table_cell`, `thematic_break`, `div`,
`admonition`, `raw_block`, `footnote`, `frontmatter`, `definition_list`,
`definition_term`, `definition_description`, `section`, `line_block`,
`comment`, `figure`, `figure_group`, `directive`, `block_extension`, `abbreviation_def`,
`link_reference_definition`, `citation_definition`.

**Inline:** `text`, `emphasis`, `strong`, `underline`, `strike`,
`inline_extension`, `mention`, `code`, `link`, `autolink`, `image`,
`non_breaking_space`, `soft_break`, `hard_break`, `raw_inline`, `escaped_text`, `footnote_ref`,
`inline_footnote`, `heading_ref`, `citation_group`, `citation`, `caption_number`,
`span`, `superscript`, `subscript`, `highlight`, `insert`, `delete`,
`substitution`, `critic_comment`, `symbol`, `math`, `abbreviation`, `small_caps`,
`ruby`.

The older schema also named `document`, `smart_punctuation`, `literal_inline`, `tag`, `abbreviation_def`, `link_reference_definition`, and `cell_wrap` outside those allow and deny lists. These are historical names in the 0.1 contract.
