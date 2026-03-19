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
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const SUPABASE_TABLE = process.env.SUPABASE_TABLE ?? 'work_entries'
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
const ALL_ASSIGNEE_VALUES = new Set(['전체', '?꾩껜', 'all', 'ALL'])

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

const normalizeAssignee = (assignee) => {
  const value = (assignee ?? '').trim()
  if (!value) return ''
  return ALL_ASSIGNEE_VALUES.has(value) ? '' : value
}

const sortByDateDesc = (items) => items.sort((a, b) => (a.date < b.date ? 1 : -1))
const makeId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

const toRoute = (pathname) => {
  if (!pathname.startsWith(API_BASE_PATH)) return null
  const route = pathname.slice(API_BASE_PATH.length)
  return route || '/'
}

const ensureDataFile = async () => {
  const dir = path.dirname(DATA_FILE)
  await fs.mkdir(dir, { recursive: true })

  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8')
  }
}

const readFileEntries = async () => {
  const raw = await fs.readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('DATA_FILE must be an array')
  }
  return parsed
}

const writeFileEntries = async (entries) => {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
}

const encodeFilterValue = (value) => encodeURIComponent(String(value))

const supabaseRequest = async (method, query = '', body) => {
  const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${query}`
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  const response = await fetch(endpoint, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${text}`)
  }

  if (response.status === 204) {
    return []
  }

  const text = await response.text()
  return text ? JSON.parse(text) : []
}

const rowToEntry = (row) => {
  const payload = typeof row.payload === 'object' && row.payload ? row.payload : {}
  return {
    id: row.id,
    ...payload,
    date: row.date,
    assignee: row.assignee,
  }
}

const createFileStore = () => ({
  async init() {
    await ensureDataFile()
  },
  async getAssignees() {
    const entries = await readFileEntries()
    const names = [...new Set(entries.map((entry) => entry.assignee).filter(Boolean))]
    return names.sort((a, b) => String(a).localeCompare(String(b), 'ko'))
  },
  async listDaily({ date, assignee }) {
    const entries = await readFileEntries()
    return sortByDateDesc(
      entries.filter((entry) => {
        const matchDate = !date || entry.date === date
        const matchAssignee = !assignee || entry.assignee === assignee
        return matchDate && matchAssignee
      }),
    )
  },
  async listDownload({ startDate, endDate, assignee }) {
    const entries = await readFileEntries()
    return sortByDateDesc(
      entries.filter((entry) => {
        const date = entry.date ?? ''
        const matchFrom = !startDate || date >= startDate
        const matchTo = !endDate || date <= endDate
        const matchAssignee = !assignee || entry.assignee === assignee
        return matchFrom && matchTo && matchAssignee
      }),
    )
  },
  async getById(id) {
    const entries = await readFileEntries()
    return entries.find((entry) => entry.id === id) ?? null
  },
  async create(payload) {
    const entries = await readFileEntries()
    const next = { id: makeId(), ...payload }
    entries.unshift(next)
    await writeFileEntries(entries)
    return next
  },
  async update(id, payload) {
    const entries = await readFileEntries()
    const index = entries.findIndex((entry) => entry.id === id)
    if (index < 0) return null
    const updated = { id, ...payload }
    entries[index] = updated
    await writeFileEntries(entries)
    return updated
  },
})

const createSupabaseStore = () => ({
  async init() {
    await supabaseRequest('GET', '?select=id&limit=1')
  },
  async getAssignees() {
    const rows = await supabaseRequest('GET', '?select=assignee')
    const names = [...new Set(rows.map((row) => row.assignee).filter(Boolean))]
    return names.sort((a, b) => String(a).localeCompare(String(b), 'ko'))
  },
  async listDaily({ date, assignee }) {
    const params = ['select=*', 'order=date.desc']
    if (date) params.push(`date=eq.${encodeFilterValue(date)}`)
    if (assignee) params.push(`assignee=eq.${encodeFilterValue(assignee)}`)
    const rows = await supabaseRequest('GET', `?${params.join('&')}`)
    return rows.map(rowToEntry)
  },
  async listDownload({ startDate, endDate, assignee }) {
    const params = ['select=*', 'order=date.desc']
    if (startDate) params.push(`date=gte.${encodeFilterValue(startDate)}`)
    if (endDate) params.push(`date=lte.${encodeFilterValue(endDate)}`)
    if (assignee) params.push(`assignee=eq.${encodeFilterValue(assignee)}`)
    const rows = await supabaseRequest('GET', `?${params.join('&')}`)
    return rows.map(rowToEntry)
  },
  async getById(id) {
    const rows = await supabaseRequest('GET', `?select=*&id=eq.${encodeFilterValue(id)}&limit=1`)
    if (!rows.length) return null
    return rowToEntry(rows[0])
  },
  async create(payload) {
    const nextId = makeId()
    const date = String(payload.date ?? '')
    const assignee = String(payload.assignee ?? '')
    const rows = await supabaseRequest('POST', '', { id: nextId, date, assignee, payload })
    return rows.length ? rowToEntry(rows[0]) : { id: nextId, ...payload, date, assignee }
  },
  async update(id, payload) {
    const date = String(payload.date ?? '')
    const assignee = String(payload.assignee ?? '')
    const rows = await supabaseRequest('PATCH', `?id=eq.${encodeFilterValue(id)}`, { date, assignee, payload })
    if (!rows.length) return null
    return rowToEntry(rows[0])
  },
})

const store = USE_SUPABASE ? createSupabaseStore() : createFileStore()
await store.init()

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
      const names = await store.getAssignees()
      sendJson(req, res, 200, ['전체', ...names])
      return
    }

    if (req.method === 'GET' && route === '/work-entries') {
      const date = url.searchParams.get('date') ?? ''
      const assignee = normalizeAssignee(url.searchParams.get('assignee'))
      const entries = await store.listDaily({ date, assignee })
      sendJson(req, res, 200, entries)
      return
    }

    if (req.method === 'GET' && route === '/work-entries/download') {
      const startDate = url.searchParams.get('startDate') ?? ''
      const endDate = url.searchParams.get('endDate') ?? ''
      const assignee = normalizeAssignee(url.searchParams.get('assignee'))
      const entries = await store.listDownload({ startDate, endDate, assignee })
      sendJson(req, res, 200, entries)
      return
    }

    const entryMatch = route.match(/^\/work-entries\/([^/]+)$/)
    if (req.method === 'GET' && entryMatch) {
      const id = decodeURIComponent(entryMatch[1])
      const found = await store.getById(id)
      if (!found) {
        sendText(req, res, 404, 'Work entry not found')
        return
      }
      sendJson(req, res, 200, found)
      return
    }

    if (req.method === 'POST' && route === '/work-entries') {
      const payload = await parseBody(req)
      const created = await store.create(payload)
      sendJson(req, res, 201, created)
      return
    }

    if (req.method === 'PUT' && entryMatch) {
      const id = decodeURIComponent(entryMatch[1])
      const payload = await parseBody(req)
      const updated = await store.update(id, payload)
      if (!updated) {
        sendText(req, res, 404, 'Work entry not found')
        return
      }
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
  console.log(`DATA_MODE=${USE_SUPABASE ? 'supabase' : 'file'}`)
  if (USE_SUPABASE) {
    console.log(`SUPABASE_URL=${SUPABASE_URL}`)
    console.log(`SUPABASE_TABLE=${SUPABASE_TABLE}`)
  } else {
    console.log(`DATA_FILE=${DATA_FILE}`)
  }
})
