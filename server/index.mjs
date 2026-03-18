import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT ?? 8080)
const API_BASE_PATH = (process.env.API_BASE_PATH ?? '/api').replace(/\/+$/, '')
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const DATA_FILE = process.env.DATA_FILE ?? path.join(__dirname, 'data', 'work-entries.json')

const ensureDataFile = async () => {
  const dir = path.dirname(DATA_FILE)
  await fs.mkdir(dir, { recursive: true })

  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8')
  }
}

const readEntries = async () => {
  const raw = await fs.readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)

  if (!Array.isArray(parsed)) {
    throw new Error('DATA_FILE must be an array')
  }

  return parsed
}

const writeEntries = async (entries) => {
  const next = `${JSON.stringify(entries, null, 2)}\n`
  await fs.writeFile(DATA_FILE, next, 'utf8')
}

const getCorsHeaders = (req) => {
  const requestOrigin = req.headers.origin
  const allowAny = CORS_ORIGIN.includes('*')
  const allowOrigin = allowAny
    ? '*'
    : requestOrigin && CORS_ORIGIN.includes(requestOrigin)
      ? requestOrigin
      : CORS_ORIGIN[0] ?? 'null'

  const headers = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (!allowAny) {
    headers.Vary = 'Origin'
  }

  return headers
}

const sendJson = (req, res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...getCorsHeaders(req),
  })
  res.end(JSON.stringify(data))
}

const sendText = (req, res, status, message) => {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...getCorsHeaders(req),
  })
  res.end(message)
}

const parseBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body is too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })

const normalizeAssignee = (assignee) => (assignee === '전체' ? '' : assignee ?? '')

const sortByDateDesc = (items) => items.sort((a, b) => (a.date < b.date ? 1 : -1))

const makeId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

const toRoute = (pathname) => {
  if (!pathname.startsWith(API_BASE_PATH)) return null
  const route = pathname.slice(API_BASE_PATH.length)
  return route || '/'
}

await ensureDataFile()

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      sendText(req, res, 400, 'Bad request')
      return
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        ...getCorsHeaders(req),
      })
      res.end()
      return
    }

    const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${PORT}`}`)
    const route = toRoute(url.pathname)
    if (!route) {
      sendText(req, res, 404, 'Not found')
      return
    }

    if (req.method === 'GET' && route === '/work-entries/assignees') {
      const entries = await readEntries()
      const names = [...new Set(entries.map((entry) => entry.assignee).filter(Boolean))]
      names.sort((a, b) => String(a).localeCompare(String(b), 'ko'))
      sendJson(req, res, 200, ['전체', ...names])
      return
    }

    if (req.method === 'GET' && route === '/work-entries') {
      const date = url.searchParams.get('date') ?? ''
      const assignee = normalizeAssignee(url.searchParams.get('assignee'))
      const entries = await readEntries()

      const filtered = entries.filter((entry) => {
        const matchDate = !date || entry.date === date
        const matchAssignee = !assignee || entry.assignee === assignee
        return matchDate && matchAssignee
      })

      sendJson(req, res, 200, sortByDateDesc(filtered))
      return
    }

    if (req.method === 'GET' && route === '/work-entries/download') {
      const startDate = url.searchParams.get('startDate') ?? ''
      const endDate = url.searchParams.get('endDate') ?? ''
      const assignee = normalizeAssignee(url.searchParams.get('assignee'))
      const entries = await readEntries()

      const filtered = entries.filter((entry) => {
        const date = entry.date ?? ''
        const matchFrom = !startDate || date >= startDate
        const matchTo = !endDate || date <= endDate
        const matchAssignee = !assignee || entry.assignee === assignee
        return matchFrom && matchTo && matchAssignee
      })

      sendJson(req, res, 200, sortByDateDesc(filtered))
      return
    }

    const entryMatch = route.match(/^\/work-entries\/([^/]+)$/)
    if (req.method === 'GET' && entryMatch) {
      const id = decodeURIComponent(entryMatch[1])
      const entries = await readEntries()
      const found = entries.find((entry) => entry.id === id)
      if (!found) {
        sendText(req, res, 404, 'Work entry not found')
        return
      }

      sendJson(req, res, 200, found)
      return
    }

    if (req.method === 'POST' && route === '/work-entries') {
      const payload = await parseBody(req)
      const entries = await readEntries()
      const next = { id: makeId(), ...payload }
      entries.unshift(next)
      await writeEntries(entries)
      sendJson(req, res, 201, next)
      return
    }

    if (req.method === 'PUT' && entryMatch) {
      const id = decodeURIComponent(entryMatch[1])
      const payload = await parseBody(req)
      const entries = await readEntries()
      const index = entries.findIndex((entry) => entry.id === id)
      if (index < 0) {
        sendText(req, res, 404, 'Work entry not found')
        return
      }

      const updated = { id, ...payload }
      entries[index] = updated
      await writeEntries(entries)
      sendJson(req, res, 200, updated)
      return
    }

    sendText(req, res, 404, 'Not found')
  } catch (error) {
    console.error('[API ERROR]', error)
    sendText(req, res, 500, 'Internal server error')
  }
})

server.listen(PORT, () => {
  console.log(`WorkEntries API listening on http://localhost:${PORT}${API_BASE_PATH}`)
  console.log(`DATA_FILE=${DATA_FILE}`)
})
