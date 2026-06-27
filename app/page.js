'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sparkles, Upload, FileText, Target, AlertTriangle, CheckCircle2, XCircle, Lightbulb, ListChecks, Briefcase, History, Loader2, ArrowRight, TrendingUp, BookOpen, Trash2, Brain, Wand2, Mail, Search, Copy, Check, ExternalLink, X } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

function getUserId() {
  if (typeof window === 'undefined') return 'anonymous'
  let uid = localStorage.getItem('cl_user_id')
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('cl_user_id', uid)
  }
  return uid
}

function scoreColor(score) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-rose-600'
}
function scoreBg(score) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-rose-500'
}
function severityColor(sev) {
  return sev === 'high' ? 'bg-rose-100 text-rose-700 border-rose-200'
    : sev === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-slate-100 text-slate-700 border-slate-200'
}

function ScoreRing({ value, label, size = 140 }) {
  const radius = (size - 16) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
      {label && <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>}
    </div>
  )
}

function Landing({ onStart }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-emerald-50" />
      <div className="absolute inset-0 -z-10 [background-image:radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:24px_24px] opacity-50" />
      <div className="container mx-auto px-6 py-20 max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <Badge className="mb-6 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-powered • Explainable ATS
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-indigo-700 bg-clip-text text-transparent">
            Land the interview.<br />Beat the ATS.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600">
            Upload your resume, paste a job description, and get an instant recruiter-grade analysis: ATS score, missing keywords, red flags, tailored bullets, and an action plan — no fluff.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button size="lg" onClick={onStart} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
              Analyze My Resume <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            {[
              { icon: Target, label: 'Hybrid ATS Score', desc: '6 dimensions, fully explained' },
              { icon: Brain, label: 'Skill Gap Analysis', desc: 'Real gaps vs. JD' },
              { icon: Lightbulb, label: 'Tailored Bullets', desc: 'Honest, never invented' },
              { icon: ListChecks, label: 'Action Plan', desc: 'Short, mid & long term' },
            ].map((f, i) => (
              <Card key={i} className="text-left border-slate-200/70 bg-white/70 backdrop-blur">
                <CardContent className="p-5">
                  <f.icon className="w-5 h-5 text-indigo-600 mb-3" />
                  <p className="font-semibold text-slate-900">{f.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function InputPanel({ onAnalyze, loading }) {
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resumeName, setResumeName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/parse-file', { method: 'POST', body: fd })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Parse failed')
      setResumeText(data.text)
      setResumeName(file.name)
      toast.success(`Parsed ${file.name} • ${data.length.toLocaleString()} chars`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const canAnalyze = resumeText.trim().length >= 30 && !loading

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" /> Your Resume</CardTitle>
                <CardDescription>Upload PDF / DOCX / TXT, or paste text directly.</CardDescription>
              </div>
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFile} disabled={uploading} />
                <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Parsing...' : 'Upload File'}
                </span>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Resume name (optional, e.g. 'Senior FE - v2')" value={resumeName} onChange={(e) => setResumeName(e.target.value)} />
            <Textarea
              rows={16}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your full resume text here..."
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">{resumeText.length.toLocaleString()} characters</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-600" /> Job Description</CardTitle>
            <CardDescription>Paste the JD you're targeting. Leave blank for general analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Job title (optional, e.g. 'Senior Frontend Engineer @ Stripe')" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <Textarea
              rows={16}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description..."
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">{jobDescription.length.toLocaleString()} characters</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          size="lg"
          disabled={!canAnalyze}
          onClick={() => onAnalyze({ resumeText, jobDescription, resumeName: resumeName || 'Untitled Resume', jobTitle })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-lg shadow-indigo-200"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with Gemini 2.5...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analyze Resume</>}
        </Button>
      </div>
    </div>
  )
}

function BreakdownBar({ name, score, weight, reason }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">{name}</span>
              <span className="text-sm font-semibold tabular-nums">{score} <span className="text-xs text-slate-400">/100 • w{weight}</span></span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${scoreBg(score)} transition-all`} style={{ width: `${score}%` }} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs"><p className="text-xs">{reason}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ResultsView({ result, onNew }) {
  const a = result.analysis
  const breakdown = a.score_breakdown
  const labels = {
    keyword_match: 'Keyword Match',
    semantic_similarity: 'Semantic Similarity',
    structure_readability: 'Structure & Readability',
    role_fit: 'Role Fit',
    skill_coverage: 'Skill Coverage',
    experience_fit: 'Experience Fit',
  }
  const [actionLoading, setActionLoading] = useState(null) // 'rewrite' | 'cover' | 'jobs' | null
  const [rewriteData, setRewriteData] = useState(null)
  const [coverData, setCoverData] = useState(null)
  const [jobsData, setJobsData] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [coverTone, setCoverTone] = useState('confident and professional')
  const [copied, setCopied] = useState(false)
  const userId = typeof window !== 'undefined' ? localStorage.getItem('cl_user_id') || 'anonymous' : 'anonymous'

  async function callAction(endpoint, body, setter, key) {
    setActionLoading(key)
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed')
      setter(data)
      toast.success(`${key} ready`)
    } catch (e) { toast.error(e.message) }
    finally { setActionLoading(null) }
  }

  function doCopy(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{result.resumeName}</h2>
          {result.jobTitle && <p className="text-sm text-slate-500">Target: {result.jobTitle}</p>}
          {result.engine === 'gemini' && (
            <Badge className="mt-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
              <Sparkles className="w-3 h-3 mr-1" /> Powered by Gemini 2.5 Flash
            </Badge>
          )}
        </div>
        <Button variant="outline" onClick={onNew}><Sparkles className="w-4 h-4 mr-2" /> New Analysis</Button>
      </div>

      {/* Phase 2 action buttons */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Button
          onClick={() => callAction('/api/rewrite', { resumeText: result.resumeText, jobDescription: result.jobDescription, userId }, setRewriteData, 'rewrite')}
          disabled={actionLoading === 'rewrite'}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white h-auto py-4"
        >
          {actionLoading === 'rewrite' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          <div className="text-left">
            <div className="font-semibold">Rewrite My Resume</div>
            <div className="text-xs opacity-90">Tailored to this JD</div>
          </div>
        </Button>
        <Button
          onClick={() => callAction('/api/cover-letter', { resumeText: result.resumeText, jobDescription: result.jobDescription, jobTitle: result.jobTitle, companyName, tone: coverTone, userId }, setCoverData, 'cover')}
          disabled={actionLoading === 'cover' || !result.jobDescription}
          className="bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 text-white h-auto py-4 disabled:opacity-50"
        >
          {actionLoading === 'cover' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          <div className="text-left">
            <div className="font-semibold">Generate Cover Letter</div>
            <div className="text-xs opacity-90">{result.jobDescription ? 'Personalized to JD' : 'Add a JD first'}</div>
          </div>
        </Button>
        <Button
          onClick={() => callAction('/api/job-alerts', { resumeText: result.resumeText, query: result.jobTitle, name: result.jobTitle || 'My matches', userId }, setJobsData, 'jobs')}
          disabled={actionLoading === 'jobs'}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white h-auto py-4"
        >
          {actionLoading === 'jobs' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          <div className="text-left">
            <div className="font-semibold">Find Matching Jobs</div>
            <div className="text-xs opacity-90">6 fits + where to apply</div>
          </div>
        </Button>
      </div>

      {/* Top score cards */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-1 border-slate-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="w-4 h-4 text-indigo-600" /> ATS Score</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ScoreRing value={a.ats_score} label="Overall ATS" />
            <div className="mt-4 grid grid-cols-2 gap-3 w-full">
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">Job Fit</p>
                <p className={`text-2xl font-bold ${scoreColor(a.job_fit_score)}`}>{a.job_fit_score}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">Missing KW</p>
                <p className="text-2xl font-bold text-slate-700">{a.missing_keywords?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-indigo-600" /> Score Breakdown <span className="text-xs font-normal text-slate-400 ml-1">(hover for explanation)</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(labels).map(([key, name]) => breakdown[key] && (
              <BreakdownBar key={key} name={name} score={breakdown[key].score} weight={breakdown[key].weight} reason={breakdown[key].reason} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="mb-6 border-slate-200 bg-gradient-to-br from-indigo-50/50 to-white">
        <CardContent className="pt-6">
          <p className="text-sm leading-relaxed text-slate-700"><span className="font-semibold text-indigo-700">Summary: </span>{a.summary}</p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="strengths" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto">
          <TabsTrigger value="strengths"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Strengths</TabsTrigger>
          <TabsTrigger value="weak"><XCircle className="w-3.5 h-3.5 mr-1.5" />Weak</TabsTrigger>
          <TabsTrigger value="flags"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Red Flags</TabsTrigger>
          <TabsTrigger value="keywords"><Target className="w-3.5 h-3.5 mr-1.5" />Keywords</TabsTrigger>
          <TabsTrigger value="bullets"><Lightbulb className="w-3.5 h-3.5 mr-1.5" />Bullets</TabsTrigger>
          <TabsTrigger value="plan"><ListChecks className="w-3.5 h-3.5 mr-1.5" />Plan</TabsTrigger>
          <TabsTrigger value="career"><BookOpen className="w-3.5 h-3.5 mr-1.5" />Career</TabsTrigger>
        </TabsList>

        <TabsContent value="strengths" className="mt-4">
          <div className="grid md:grid-cols-2 gap-3">
            {a.strengths?.map((s, i) => (
              <Card key={i} className="border-emerald-200 bg-emerald-50/30">
                <CardContent className="p-4">
                  <p className="font-semibold text-emerald-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{s.title}</p>
                  <p className="text-sm text-slate-700 mt-1.5">{s.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weak" className="mt-4">
          <div className="grid md:grid-cols-2 gap-3">
            {a.weak_points?.map((w, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{w.title}</p>
                    <Badge variant="outline" className={severityColor(w.severity)}>{w.severity}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mt-1.5">{w.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flags" className="mt-4">
          {a.red_flags?.length ? (
            <div className="grid md:grid-cols-2 gap-3">
              {a.red_flags.map((f, i) => (
                <Card key={i} className="border-rose-200 bg-rose-50/30">
                  <CardContent className="p-4">
                    <p className="font-semibold text-rose-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{f.title}</p>
                    <p className="text-sm text-slate-700 mt-1.5">{f.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500 p-4">No red flags detected — good job!</p>}
        </TabsContent>

        <TabsContent value="keywords" className="mt-4 space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Missing Keywords</CardTitle><CardDescription>Add these where truthful and relevant.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {a.missing_keywords?.map((k, i) => (
                  <TooltipProvider key={i} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`cursor-help ${k.importance === 'must-have' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {k.keyword} {k.importance === 'must-have' && <span className="ml-1">★</span>}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs"><p className="text-xs"><b>Where:</b> {k.where_to_add}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Skill Gaps</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {a.skill_gaps?.map((g, i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900">{g.skill}</p>
                  <p className="text-xs text-slate-500 mt-1"><b>Why:</b> {g.why_it_matters}</p>
                  <p className="text-xs text-slate-500 mt-0.5"><b>How:</b> {g.how_to_learn}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bullets" className="mt-4 space-y-3">
          {a.tailored_bullets?.map((b, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Badge variant="outline" className="mb-2">{b.section}</Badge>
                <div className="grid md:grid-cols-2 gap-3 mt-2">
                  <div className="p-3 rounded bg-slate-50 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-1">ORIGINAL</p>
                    <p className="text-sm text-slate-600">{b.original || '(new bullet)'}</p>
                  </div>
                  <div className="p-3 rounded bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">REWRITTEN</p>
                    <p className="text-sm text-slate-800">{b.rewritten}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2"><b>Why:</b> {b.rationale}</p>
              </CardContent>
            </Card>
          ))}
          {a.project_ideas?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Project Ideas to Close Gaps</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {a.project_ideas.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{p.title}</p>
                      <span className="text-xs text-slate-500">~{p.effort_hours}h</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{p.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.skills_practiced?.map((s, j) => <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { key: 'short_term', label: 'This Week', color: 'border-rose-200 bg-rose-50/30' },
              { key: 'medium_term', label: 'Next Month', color: 'border-amber-200 bg-amber-50/30' },
              { key: 'long_term', label: '3-6 Months', color: 'border-emerald-200 bg-emerald-50/30' },
            ].map((sec) => (
              <Card key={sec.key} className={sec.color}>
                <CardHeader className="pb-3"><CardTitle className="text-sm">{sec.label}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {a.action_plan?.[sec.key]?.map((s, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium text-slate-900">→ {s.step}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.impact}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="career" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Role Recommendations</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {a.role_recommendations?.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{r.role}</p>
                    <Badge className={scoreBg(r.fit_score) + ' text-white border-0'}>{r.fit_score}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{r.why}</p>
                  <div className="flex gap-2 mt-2">
                    <a href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(r.role)}`} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 underline-offset-2 hover:underline">
                      <ExternalLink className="w-3 h-3" /> LinkedIn
                    </a>
                    <a href={`https://wellfound.com/jobs?role=${encodeURIComponent(r.role)}`} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 underline-offset-2 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Wellfound
                    </a>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(r.role + ' jobs')}`} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 underline-offset-2 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Google
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Interview Prep</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {a.interview_prep?.map((q, i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-200">
                  <Badge variant="outline" className="text-xs mb-2">{q.topic}</Badge>
                  <p className="text-sm font-medium text-slate-900">{q.question}</p>
                  <p className="text-xs text-slate-500 mt-1"><b>Why asked:</b> {q.why}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rewrite Dialog */}
      <Dialog open={!!rewriteData} onOpenChange={(o) => !o && setRewriteData(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-violet-600" /> Rewritten Resume</DialogTitle>
            <DialogDescription>Tailored to your target JD. Facts preserved — nothing invented.</DialogDescription>
          </DialogHeader>
          {rewriteData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">Tone: {rewriteData.result?.tone}</Badge>
                <Button size="sm" variant="outline" onClick={() => doCopy(rewriteData.result?.rewritten_resume || '')}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />} Copy
                </Button>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800">{rewriteData.result?.rewritten_resume}</pre>
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">What changed</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {rewriteData.result?.change_summary?.map((c, i) => (
                    <p key={i} className="text-xs text-slate-600">• {c}</p>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cover Letter Dialog */}
      <Dialog open={!!coverData} onOpenChange={(o) => !o && setCoverData(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-pink-600" /> Cover Letter</DialogTitle>
            <DialogDescription>{coverData?.result?.word_count} words • Personalized using your resume</DialogDescription>
          </DialogHeader>
          {coverData && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => doCopy(coverData.result?.cover_letter || '')}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />} Copy
                </Button>
              </div>
              <div className="bg-gradient-to-br from-pink-50/30 to-white border border-pink-200 rounded-lg p-6 max-h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-serif text-sm text-slate-800 leading-relaxed">{coverData.result?.cover_letter}</pre>
              </div>
              {coverData.result?.key_matches?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Key resume facts used</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {coverData.result.key_matches.map((m, i) => (
                      <p key={i} className="text-xs text-slate-600">✓ {m}</p>
                    ))}
                  </CardContent>
                </Card>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Company name (regenerate)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="text-xs" />
                <select value={coverTone} onChange={(e) => setCoverTone(e.target.value)} className="text-xs border border-slate-200 rounded px-3">
                  <option value="confident and professional">Confident & professional</option>
                  <option value="warm and enthusiastic">Warm & enthusiastic</option>
                  <option value="direct and concise">Direct & concise</option>
                  <option value="storytelling">Storytelling</option>
                </select>
              </div>
              <Button size="sm" variant="outline" className="w-full"
                onClick={() => callAction('/api/cover-letter', { resumeText: result.resumeText, jobDescription: result.jobDescription, jobTitle: result.jobTitle, companyName, tone: coverTone, userId }, setCoverData, 'cover')}
                disabled={actionLoading === 'cover'}>
                {actionLoading === 'cover' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Regenerate
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Jobs Dialog */}
      <Dialog open={!!jobsData} onOpenChange={(o) => !o && setJobsData(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-emerald-600" /> Matching Jobs</DialogTitle>
            <DialogDescription>{jobsData?.jobs?.length} roles matched to your resume. Click "Where to apply" to find live listings.</DialogDescription>
          </DialogHeader>
          {jobsData && (
            <div className="grid md:grid-cols-2 gap-3">
              {jobsData.jobs?.map((j, i) => (
                <Card key={i} className="border-slate-200 hover:border-emerald-300 hover:shadow-md transition">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{j.title}</p>
                        <p className="text-xs text-slate-600 truncate">{j.company} • {j.location}</p>
                      </div>
                      <Badge className={scoreBg(j.fit_score) + ' text-white border-0 shrink-0'}>{j.fit_score}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary" className="font-mono">{j.salary_range}</Badge>
                      <Badge variant="outline" className="capitalize">{j.seniority}</Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Why it fits</p>
                      <ul className="text-xs text-slate-700 space-y-0.5">
                        {j.match_reasons?.slice(0,3).map((r, k) => <li key={k}>• {r}</li>)}
                      </ul>
                    </div>
                    {j.key_requirements?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                        {j.key_requirements.slice(0,5).map((k, idx) => <Badge key={idx} variant="outline" className="text-[10px]">{k}</Badge>)}
                      </div>
                    )}
                    <a
                      href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((j.title || '') + ' ' + (j.company || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:text-emerald-900 pt-1 flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Search on LinkedIn — {j.where_to_apply}
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function HistoryPanel({ items, onOpen, onDelete }) {
  if (!items?.length) return null
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Past Analyses</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 group">
            <button onClick={() => onOpen(it.id)} className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900 truncate">{it.resumeName}</p>
              <p className="text-xs text-slate-500 truncate">{it.jobTitle || 'General'} • {new Date(it.createdAt).toLocaleDateString()}</p>
            </button>
            <div className="flex items-center gap-2">
              <Badge className={scoreBg(it.ats_score) + ' text-white border-0'}>{it.ats_score}</Badge>
              <button onClick={() => onDelete(it.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function App() {
  const [view, setView] = useState('landing') // landing | input | results
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const userId = useMemo(() => getUserId(), [])

  async function loadHistory() {
    try {
      const r = await fetch(`/api/history?userId=${userId}`)
      const data = await r.json()
      if (Array.isArray(data)) setHistory(data)
    } catch {}
  }
  useEffect(() => { loadHistory() }, [userId])

  async function handleAnalyze(payload) {
    setLoading(true)
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data)
      setView('results')
      loadHistory()
      toast.success(`ATS Score: ${data.analysis.ats_score}/100`)
    } catch (e) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  async function openHistory(id) {
    try {
      const r = await fetch('/api/analysis/' + id)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setResult(data)
      setView('results')
    } catch (e) { toast.error(e.message) }
  }

  async function deleteHistory(id) {
    await fetch('/api/analysis/' + id, { method: 'DELETE' })
    loadHistory()
    toast.success('Deleted')
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" richColors />
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 max-w-7xl flex items-center justify-between">
          <button onClick={() => setView('landing')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">CareerLens</span>
          </button>
          <div className="flex items-center gap-2">
            {view !== 'input' && <Button variant="ghost" size="sm" onClick={() => setView('input')}>New Analysis</Button>}
          </div>
        </div>
      </header>

      {view === 'landing' && <Landing onStart={() => setView('input')} />}
      {view === 'input' && (
        <div>
          <InputPanel onAnalyze={handleAnalyze} loading={loading} />
          {history.length > 0 && (
            <div className="container mx-auto px-6 pb-10 max-w-7xl">
              <HistoryPanel items={history} onOpen={openHistory} onDelete={deleteHistory} />
            </div>
          )}
        </div>
      )}
      {view === 'results' && result && <ResultsView result={result} onNew={() => setView('input')} />}

      <footer className="border-t border-slate-200 mt-12">
        <div className="container mx-auto px-6 py-6 max-w-7xl text-xs text-slate-500 text-center">
          CareerLens • Powered by Gemini 2.5 Flash • Honest, explainable, AI-driven feedback
        </div>
      </footer>
    </div>
  )
}

export default App
