/*
 * The authored heading for every optional-corpus manifest feature.
 *
 * REQUIRED, not a fallback. Title-casing the id produces "Bare Url Autolink"
 * and "Ansi Typography Source" - a slug wearing capitals, not a name a reader
 * recognizes. Making the map required means a new manifest feature stops the
 * build until someone names it, instead of shipping the slug-cased fallback
 * nobody would notice.
 *
 * WHY THIS IS ITS OWN MODULE. The requirement used to live inside
 * `scripts/generate-example-pages.mjs`, which only `docs:pages`, `docs:dev`
 * and `docs:build` invoke - so a feature added without a title passed the
 * whole local suite and failed in a later job, after the contributor had moved
 * on. That is what carve#1490 was filed for, and it is the same boundary
 * carve#1483 moved for the routing direction. A script that generates files as
 * a side effect of import cannot be read by a test, so the table moves here
 * and `tests/no-orphan-pages.test.mjs` asserts both directions of it.
 */
export const optionalFeatureTitles = new Map([
  ['citations-numbered', 'Citations, numbered'],
  ['citations-author-date', 'Citations, author-date'],
  ['code-callouts', 'CodeCallouts'],
  ['details', 'Details'],
  ['list-table', 'ListTable'],
  ['list-table-columns-1344', 'ListTable column metadata and footer rows'],
  ['list-table-local-headers-1248', 'ListTable local headers and body groups'],
  ['spoiler', 'Spoiler'],
  ['tabs', 'Tabs'],
  ['tabs-aria', 'Tabs in aria mode'],
  ['semantic-span', 'SemanticSpan'],
  ['social-link-templates', 'Mention and tag URL templates'],
  ['symbol-map', 'Symbol map'],
  ['smart-quotes-locale-de', 'Smart quotes (de locale)'],
  ['bare-url-autolink', 'Bare-URL autolinking'],
  ['smart-typography-off', 'Smart typography off'],
  ['smart-typography-default', 'Smart typography at default (control)'],
  ['section-wrapper-off', 'Section wrapper off'],
  ['source-line-after-generated-id', 'Source-line annotation order'],
  ['markdown-typography-source', 'Markdown target, source typography'],
  ['plain-typography-source', 'Plain-text target, source typography'],
  ['ansi-typography-source', 'ANSI target, source typography'],
])
