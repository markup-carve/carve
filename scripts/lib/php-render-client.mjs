/*
 * A synchronous client for php-render-server.php: one warm php process renders
 * batch after batch, so a render costs carve-php's work and not php's start-up
 * (~350 ms a process here, which was most of a fuzz reduction).
 *
 * The php process belongs to a worker thread; the caller blocks on Atomics.wait
 * with a deadline, so a php process that hangs or dies yields null instead of
 * blocking the caller. The next call starts a fresh process.
 */
import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER = join(dirname(fileURLToPath(import.meta.url)), 'php-render-server.php')

const WORKER = `
const { workerData, parentPort } = require('node:worker_threads')
const { spawn } = require('node:child_process')
const flag = new Int32Array(workerData.shared)
const child = spawn('php', [workerData.server, workerData.phpDir], { stdio: ['pipe', 'pipe', 'inherit'] })
let port
let buffer = ''
const reply = (message) => {
  if (!port) return
  port.postMessage(message)
  Atomics.store(flag, 0, 1)
  Atomics.notify(flag, 0)
}
child.stdout.setEncoding('utf8')
child.stdout.on('data', (chunk) => {
  buffer += chunk
  for (let at; (at = buffer.indexOf('\\n')) >= 0; buffer = buffer.slice(at + 1)) reply({ line: buffer.slice(0, at) })
})
child.on('exit', (code, signal) => reply({ exit: code ?? signal }))
child.stdin.on('error', () => {})
parentPort.on('message', (message) => {
  if (message.port) {
    port = message.port
    reply({ pid: child.pid })
  } else child.stdin.write(message.line + '\\n')
})
`

export function phpRenderer(phpDir) {
  let server = null

  const start = () => {
    const shared = new SharedArrayBuffer(4)
    const { port1, port2 } = new MessageChannel()
    const worker = new Worker(WORKER, { eval: true, workerData: { server: SERVER, phpDir, shared } })
    worker.postMessage({ port: port2 }, [port2])
    worker.unref()
    return { worker, port: port1, flag: new Int32Array(shared) }
  }

  // Killed from here, by pid: a worker being terminated may never run a kill request.
  const stop = () => {
    if (!server) return
    for (let m; (m = receiveMessageOnPort(server.port)); ) server.pid ??= m.message.pid
    if (server.pid) {
      try {
        process.kill(server.pid, 'SIGKILL')
      } catch {
        // already gone
      }
    }
    server.worker.terminate()
    server = null
  }

  /** HTML (or `{ error }`) per source, or null when php hung, died or answered garbage. */
  const render = (sources, timeoutMs = 60_000) => {
    server ??= start()
    const { worker, port, flag } = server
    Atomics.store(flag, 0, 0)
    worker.postMessage({ line: JSON.stringify(sources) })
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const received = receiveMessageOnPort(port)
      if (received?.message.pid) {
        server.pid = received.message.pid
        continue
      }
      if (received) {
        const { line } = received.message
        try {
          const out = line === undefined ? null : JSON.parse(line)
          if (Array.isArray(out) && out.length === sources.length) return out
        } catch {
          // fall through: a malformed answer is a dead server
        }
        stop()
        return null
      }
      const left = deadline - Date.now()
      if (left <= 0) {
        stop()
        return null
      }
      Atomics.wait(flag, 0, 0, left)
      Atomics.store(flag, 0, 0)
    }
  }

  return { render, close: stop }
}
