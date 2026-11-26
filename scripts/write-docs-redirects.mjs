#!/usr/bin/env node
// Writes redirect stubs so a version path stays valid while that version is latest.
// GitHub Pages cannot send a 301, so each stub is a canonical link + instant meta refresh,
// and the root 404.html rewrites any path the stubs do not cover.
// Usage: write-docs-redirects.mjs <latest dist> <combined dist> <latest base> <redirect base>...
import fs from 'node:fs'
import path from 'node:path'

const [latestDist, dist, latestBase, ...redirectBases] = process.argv.slice(2)
if (!latestDist || !dist || !latestBase?.endsWith('/') || redirectBases.length === 0) {
  console.error('Usage: write-docs-redirects.mjs <latest dist> <combined dist> <latest base ending in /> <redirect base>...')
  process.exit(2)
}

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// cleanUrls: foo.html is served at foo, dir/index.html at dir/.
const pageUrl = (rel) => {
  const posix = rel.split(path.sep).join('/')
  if (posix === 'index.html') return ''
  if (posix.endsWith('/index.html')) return posix.slice(0, -'index.html'.length)
  return posix.replace(/\.html$/, '')
}

const subpathOf = (base) => {
  if (!base.startsWith(latestBase) || !base.endsWith('/') || base.includes('..') || base === latestBase) {
    console.error(`Redirect base ${base} must be a child of ${latestBase} ending in /`)
    process.exit(1)
  }
  return base.slice(latestBase.length, -1)
}

const subpaths = redirectBases.map(subpathOf)

// Pages of the latest side's own build, so no stub mirrors another version.
const pages = []
const walk = (dir, rel = '') => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? path.join(rel, entry.name) : entry.name
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name), relPath)
    } else if (entry.name.endsWith('.html') && relPath !== '404.html') {
      pages.push(relPath)
    }
  }
}
walk(latestDist)

const stub = (target) => {
  const href = escapeAttr(target)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting</title>
<link rel="canonical" href="${href}">
<meta http-equiv="refresh" content="0; url=${href}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>
</head>
<body><p><a href="${href}">This page moved to ${href}</a>.</p></body>
</html>
`
}

let written = 0
for (const sub of subpaths) {
  const stubRoot = path.join(dist, sub)
  if (fs.existsSync(path.join(stubRoot, 'index.html'))) {
    console.error(`${stubRoot} already holds a build; a redirect base cannot also be a built version`)
    process.exit(1)
  }
  for (const rel of pages) {
    const file = path.join(stubRoot, rel)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, stub(latestBase + pageUrl(rel)))
    written++
  }
}

// Catch-all for URLs no stub covers (removed pages, typos). People follow it; crawlers still see 404.
const notFound = path.join(dist, '404.html')
if (fs.existsSync(notFound)) {
  const rewrite = `<script>(function(){var p=location.pathname,b=${JSON.stringify(redirectBases)};for(var i=0;i<b.length;i++){if(p.indexOf(b[i])===0){location.replace(${JSON.stringify(latestBase)}+p.slice(b[i].length)+location.search+location.hash);return}}})()</script>`
  const html = fs.readFileSync(notFound, 'utf8')
  if (!html.includes('<head>')) {
    console.error(`${notFound} has no <head> to patch`)
    process.exit(1)
  }
  fs.writeFileSync(notFound, html.replace('<head>', `<head>${rewrite}`))
}

console.log(`Redirect stubs: ${written} pages under ${redirectBases.join(', ')} -> ${latestBase}`)
