import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { analyzeHeuristic } from '@/lib/heuristic_analyzer'

export const runtime = 'nodejs'
export const maxDuration = 120

// MongoDB connection (cached)
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ---- File parsing ----
async function parsePdfBuffer(buf) {
  // pdf-parse exports its function via index.js but reads test file at top-level
  // import the lib directly to avoid that issue
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
  const data = await pdfParse(buf)
  return data.text || ''
}

async function parseDocxBuffer(buf) {
  const result = await mammoth.extractRawText({ buffer: buf })
  return result.value || ''
}

// ---- Analysis (heuristic, no AI needed) ----
function runAnalysis(resumeText, jobDescription) {
  return analyzeHeuristic(resumeText, jobDescription)
}

// ---- Route handlers ----
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'CareerLens API ready' }))
    }

    // ---- POST /api/parse-file (multipart) ----
    if (route === '/parse-file' && method === 'POST') {
      const formData = await request.formData()
      const file = formData.get('file')
      if (!file || typeof file === 'string') {
        return handleCORS(NextResponse.json({ error: 'No file provided' }, { status: 400 }))
      }
      const name = file.name || 'upload'
      const arrayBuf = await file.arrayBuffer()
      const buf = Buffer.from(arrayBuf)
      const lower = name.toLowerCase()
      let text = ''
      try {
        if (lower.endsWith('.pdf')) {
          text = await parsePdfBuffer(buf)
        } else if (lower.endsWith('.docx')) {
          text = await parseDocxBuffer(buf)
        } else if (lower.endsWith('.txt')) {
          text = buf.toString('utf-8')
        } else {
          return handleCORS(NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT.' }, { status: 400 }))
        }
      } catch (e) {
        console.error('Parse error:', e)
        return handleCORS(NextResponse.json({ error: 'Failed to parse file: ' + e.message }, { status: 500 }))
      }
      if (!text || text.trim().length < 30) {
        return handleCORS(NextResponse.json({ error: 'Could not extract meaningful text. If scanned PDF, paste text instead.' }, { status: 400 }))
      }
      return handleCORS(NextResponse.json({ text, filename: name, length: text.length }))
    }

    // ---- POST /api/analyze ----
    if (route === '/analyze' && method === 'POST') {
      const body = await request.json()
      const resumeText = (body.resumeText || '').trim()
      const jobDescription = (body.jobDescription || '').trim()
      const userId = body.userId || 'anonymous'
      const resumeName = body.resumeName || 'Untitled Resume'
      const jobTitle = body.jobTitle || ''

      if (!resumeText || resumeText.length < 30) {
        return handleCORS(NextResponse.json({ error: 'Resume text too short. Please paste a real resume.' }, { status: 400 }))
      }

      let analysis
      try {
        analysis = runAnalysis(resumeText, jobDescription)
      } catch (e) {
        console.error('LLM error:', e)
        return handleCORS(NextResponse.json({ error: 'AI analysis failed: ' + (e.message || 'unknown') }, { status: 500 }))
      }

      const doc = {
        id: uuidv4(),
        userId,
        resumeName,
        jobTitle,
        resumeText,
        jobDescription,
        analysis,
        createdAt: new Date().toISOString(),
      }
      await db.collection('analyses').insertOne(doc)
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    // ---- GET /api/history?userId=xxx ----
    if (route === '/history' && method === 'GET') {
      const url = new URL(request.url)
      const userId = url.searchParams.get('userId') || 'anonymous'
      const items = await db.collection('analyses')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      const cleaned = items.map(({ _id, resumeText, jobDescription, ...rest }) => ({
        ...rest,
        ats_score: rest.analysis?.ats_score,
        job_fit_score: rest.analysis?.job_fit_score,
      }))
      return handleCORS(NextResponse.json(cleaned))
    }

    // ---- GET /api/analysis/[id] ----
    if (route.startsWith('/analysis/') && method === 'GET') {
      const id = route.split('/')[2]
      const doc = await db.collection('analyses').findOne({ id })
      if (!doc) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    // ---- DELETE /api/analysis/[id] ----
    if (route.startsWith('/analysis/') && method === 'DELETE') {
      const id = route.split('/')[2]
      await db.collection('analyses').deleteOne({ id })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
