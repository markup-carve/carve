# Edge Cases examples

The corner cases: precise boundary rules, table alignment variants, lazy continuation, paragraph interruption, security hardening, and other robustness guarantees. These pin behavior that is easy to get subtly wrong.

Each file holds one `##` section and generates the corpus rows `tests/corpus/N-slug*.{crv,html}`. The file name is `NNNN-slug.md`: `NNNN` is the section's corpus number, `slug` is its title slugified. The generator skips this README.

## Adding a section

1. Take the highest number in this directory plus one, and the slug of your title: `0790-my-new-rule.md`.
2. Route the section to a page with front matter instead of editing `resources/example-pages.txt`:

   ```
   ---
   page: edge-lists
   ---

   ## My new rule
   ```

   The section is appended to that page, after its listed entries, in number order.
3. Run `npm run corpus:build`.

If another PR takes the same number first, keep yours. The number is a sort key and the slug is the identity, so two sections sharing a number are both valid and neither is renumbered.

A number never changes once merged, and a file is never removed: engines allowlist corpus rows by `N-slug`. Within a section, add new pairs at the end.
