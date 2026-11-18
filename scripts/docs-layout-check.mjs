#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:net'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = resolve(process.env.DOCS_SCREENSHOT_DIR ?? join(tmpdir(), 'carve-docs-screenshots'))
const chromeBin = process.env.CHROME_BIN ?? 'google-chrome-stable'
const routes = [
  ['home', '/'], ['get-started', '/get-started'], ['playground', '/playground'],
  ['reference', '/cheatsheet'], ['example', '/examples/core'],
]
const viewports = [[1440, 1000], [390, 844]]
const errors = []
const children = []
mkdirSync(output, { recursive: true })

async function freePort() {
  const server = createServer()
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  const port = server.address().port
  await new Promise((done) => server.close(done))
  return port
}

async function until(fn, timeout = 30000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const result = await Promise.resolve().then(fn).catch(() => null)
    if (result) return result
    await new Promise((done) => setTimeout(done, 150))
  }
  throw new Error('Timed out waiting for docs preview or Chrome')
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.next = 1
    this.pending = new Map()
    this.listeners = new Map()
    this.ready = new Promise((done, reject) => {
      this.ws.addEventListener('open', done, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const pending = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
      } else if (message.method) {
        for (const handler of this.listeners.get(message.method) ?? []) handler(message.params)
      }
    })
  }
  async send(method, params = {}) {
    await this.ready
    const id = this.next++
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
    this.ws.send(JSON.stringify({ id, method, params }))
    return result
  }
  on(method, handler) {
    const list = this.listeners.get(method) ?? []
    list.push(handler)
    this.listeners.set(method, list)
  }
  event(method) {
    return new Promise((done) => this.on(method, done))
  }
  close() { this.ws.close() }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

function recordConsole(cdp, current) {
  cdp.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') errors.push(`${current.name}: console error: ${args.map((arg) => arg.value ?? arg.description).join(' ')}`)
  })
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    errors.push(`${current.name}: uncaught exception: ${exceptionDetails.text}`)
  })
  cdp.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') errors.push(`${current.name}: browser log error: ${entry.text}`)
  })
}

async function main() {
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  const preview = spawn(process.execPath, [join(root, 'node_modules/vitepress/bin/vitepress.js'), 'preview', 'docs', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
  children.push(preview)
  let previewLog = ''
  preview.on('error', (error) => { previewLog += error.message })
  preview.stderr.on('data', (chunk) => { previewLog += chunk })
  await until(async () => (await fetch(`${base}/carve/`)).ok, 30000).catch(() => { throw new Error(`Preview failed: ${previewLog}`) })

  const profile = mkdtempSync(join(tmpdir(), 'carve-docs-chrome-'))
  const chrome = spawn(chromeBin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--remote-allow-origins=*', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'pipe' })
  children.push(chrome)
  let chromeLog = ''
  chrome.on('error', (error) => { chromeLog += error.message })
  chrome.stderr.on('data', (chunk) => { chromeLog += chunk })
  const debugPort = await until(() => {
    try { return Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]) || null }
    catch { return null }
  }, 30000).catch(() => { throw new Error(`Chrome failed: ${chromeLog}`) })
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json())
  const cdp = new Cdp(target.webSocketDebuggerUrl)
  const current = { name: 'startup' }
  recordConsole(cdp, current)
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Log.enable')])
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "localStorage.setItem('vitepress-theme-appearance', new URL(location.href).searchParams.get('docsTheme') || 'light')",
  })

  let screenshots = 0
  for (const [name, route] of routes) {
    for (const [width, height] of viewports) {
      for (const theme of ['light', 'dark']) {
        current.name = `${name} ${width}x${height} ${theme}`
        await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 390 })
        const loaded = cdp.event('Page.loadEventFired')
        await cdp.send('Page.navigate', { url: `${base}/carve${route}?docsTheme=${theme}` })
        await Promise.race([loaded, new Promise((_, reject) => setTimeout(() => reject(new Error(`Page load timeout: ${current.name}`)), 20000))])
        await until(() => evaluate(cdp, 'document.readyState === "complete"'), 10000)
        await new Promise((done) => setTimeout(done, name === 'playground' ? 1000 : 350))
        const geometry = await evaluate(cdp, `(() => {
          const heading = [...document.querySelectorAll('h1')].find((node) => node.getClientRects().length)
          const nav = document.querySelector('.VPNavBar')
          const h = heading?.getBoundingClientRect(), n = nav?.getBoundingClientRect()
          return { title: document.title, heading: heading?.textContent, scroll: document.documentElement.scrollWidth,
            overlap: Boolean(h && n && n.bottom > h.top + 1 && n.left < h.right && n.right > h.left),
            navBottom: n?.bottom, headingTop: h?.top }
        })()`)
        if (!geometry.heading) errors.push(`${current.name}: first heading missing`)
        if (width === 390 && geometry.scroll > width + 1) errors.push(`${current.name}: horizontal scroll ${geometry.scroll}px`)
        if (geometry.overlap) errors.push(`${current.name}: nav overlaps first heading (${geometry.navBottom}px > ${geometry.headingTop}px)`)
        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        writeFileSync(join(output, `${name}-${width}x${height}-${theme}.png`), Buffer.from(screenshot.data, 'base64'))
        screenshots++
        if (name === 'home' && width === 390 && theme === 'light') {
          const found = await evaluate(cdp, `(() => {
            const button = document.querySelector('.VPNavBarHamburger')
            if (!button) return false
            button.click()
            return true
          })()`)
          await new Promise((done) => setTimeout(done, 250))
          const opened = found && await evaluate(cdp, `(() => {
            const screen = document.querySelector('.VPNavScreen')
            return Boolean(screen && screen.getBoundingClientRect().height > 0 && getComputedStyle(screen).visibility !== 'hidden')
          })()`)
          if (!opened) errors.push(`${current.name}: mobile menu did not open`)
          const menu = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
          writeFileSync(join(output, 'home-390x844-light-menu-open.png'), Buffer.from(menu.data, 'base64'))
          screenshots++
        }
      }
    }
  }
  cdp.close()
  console.log(`Docs layout: ${screenshots} screenshots in ${output}; ${errors.length} errors.`)
  for (const error of errors) console.error(error)
  if (errors.length) process.exitCode = 1
}

try { await main() }
catch (error) { console.error(error); process.exitCode = 1 }
finally { for (const child of children.reverse()) child.kill('SIGTERM') }
