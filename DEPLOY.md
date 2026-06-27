# CareerLens — Deployment Guide

> Deploy to production in ~15 minutes using Vercel + MongoDB Atlas + Gemini (all free tiers).

🔗 **Live demo:** [career-lens-codic.vercel.app](https://career-lens-codic.vercel.app)

---

## Prerequisites

- GitHub account
- Google account (for Gemini API)
- [Vercel](https://vercel.com) account (free, sign up with GitHub)
- [MongoDB Atlas](https://cloud.mongodb.com) account (free)

---

## Step 1 — Push to GitHub (2 min)

```bash
git clone https://github.com/cyscodic/CareerLens.git
cd CareerLens
yarn install
```

> ⚠️ Make sure `.env` is in `.gitignore`. Never commit secrets.

---

## Step 2 — MongoDB Atlas (5 min)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Build a Database** → choose **M0 Free**
2. Pick a region → **Create**
3. **Database Access** → Add user → set username + password (save it)
4. **Network Access** → Add IP → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. **Connect** → **Drivers** → copy the URI:

```
mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Replace `YOUR_PASSWORD` with the password you saved.

---

## Step 3 — Gemini API Key (1 min)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API Key** → copy it (starts with `AIza...`)

> If you hit quota limit, create a fresh project for default free-tier quota.

---

## Step 4 — Deploy on Vercel (5 min)

1. Go to [vercel.com/new](https://vercel.com/new) → import `cyscodic/CareerLens`
2. Vercel auto-detects Next.js — leave build settings as default
3. Add these environment variables:

| Key | Value |
|-----|-------|
| `MONGO_URL` | Your Atlas URI from Step 2 |
| `DB_NAME` | `careerlens` |
| `NEXT_PUBLIC_BASE_URL` | Leave blank for now |
| `CORS_ORIGINS` | `*` |
| `GEMINI_API_KEY` | Your Gemini key from Step 3 |
| `GEMINI_MODEL` | `gemini-2.5-flash` |

4. Click **Deploy** → wait 2–3 minutes
5. Once live, copy your Vercel URL (e.g. `https://careerlens-xyz.vercel.app`)
6. Go to **Settings → Environment Variables** → set `NEXT_PUBLIC_BASE_URL` to your URL
7. **Deployments → Redeploy** to apply the new variable

---

## Step 5 — Verify

- Open your Vercel URL
- Paste a resume + job description → click **Analyze Resume**
- Test **Rewrite Resume**, **Generate Cover Letter**, **Find Matching Jobs**

---

## Updating Later

```bash
git add .
git commit -m "your update"
git push origin main
```

Vercel auto-redeploys on every push to `main`.

---

## Cost

| Service | Free Tier |
|---------|-----------|
| Vercel | 100 GB bandwidth/month, unlimited builds |
| MongoDB Atlas M0 | 512 MB storage (~10,000 analyses) |
| Gemini 2.5 Flash | 1,500 requests/day free |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `MongoServerError: bad auth` | Wrong password in `MONGO_URL` — re-copy from Atlas |
| `MongoNetworkError` | Set Network Access to `0.0.0.0/0` in Atlas |
| `Gemini quota exceeded` | Wait 24h or enable billing on Google Cloud |
| Analysis falls back to heuristic | Check Vercel logs — Gemini key may need a fresh project |
| `Failed to parse file` | Scanned PDF has no text layer — paste text instead |
