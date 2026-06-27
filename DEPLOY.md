# 🚀 CareerLens Deployment Guide

Step-by-step guide to deploy CareerLens to production on **Vercel + MongoDB Atlas** (both free tiers). Total time: ~15 minutes.

---

## Prerequisites

- A GitHub account
- A Google account (for Gemini API)
- A Vercel account (free) — sign up at https://vercel.com (use GitHub login)
- A MongoDB Atlas account (free) — sign up at https://cloud.mongodb.com

---

## Step 1 — Push the code to GitHub (3 min)

```bash
# In /app folder on your laptop:
cd /path/to/careerlens

git init
git add .
git commit -m "CareerLens MVP"

# Create a new empty repo on GitHub (https://github.com/new), then:
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/careerlens.git
git push -u origin main
```

⚠️ **Important:** Make sure `.env` is in `.gitignore` (it should already be). Never commit secrets.

---

## Step 2 — Set up MongoDB Atlas (5 min)

1. Go to https://cloud.mongodb.com → sign up / log in.
2. Click **Build a Database** → choose **M0 Free** (512 MB, free forever).
3. Pick a region close to you. Click **Create**.
4. **Database Access**:
   - Click "Database Access" in the left sidebar.
   - Click "Add New Database User".
   - Username: `careerlens_user`. Password: click "Autogenerate" — **copy and save it**.
   - Built-in role: "Atlas admin" (or "Read and write to any database").
   - Click "Add User".
5. **Network Access**:
   - Click "Network Access" → "Add IP Address" → click **"Allow Access from Anywhere"** (0.0.0.0/0). Vercel needs this since its IPs change.
   - Click "Confirm".
6. **Get the connection string**:
   - Go back to "Database" → click "Connect" on your cluster.
   - Choose "Drivers" → Node.js.
   - Copy the connection string. It will look like:
     ```
     mongodb+srv://careerlens_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with the password you saved. Keep this safe.

---

## Step 3 — Get a Gemini API key (2 min)

1. Go to https://aistudio.google.com/app/apikey
2. Click **"Create API key"** → choose a project (or create new).
3. Copy the key (starts with `AIza...` typically).

> **Note:** If your project shows a `limit: 0` quota error like ours did, click **"Get API key" → "Use in a new project"** to create a fresh project with default free-tier quota.

---

## Step 4 — Deploy to Vercel (5 min)

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"** → select your `careerlens` repo.
3. Vercel auto-detects Next.js — leave all build settings as default.
4. Expand **"Environment Variables"** and add these 5:

   | Name | Value |
   | --- | --- |
   | `MONGO_URL` | Your Atlas connection string from Step 2 |
   | `DB_NAME` | `careerlens` |
   | `NEXT_PUBLIC_BASE_URL` | Leave blank for now — set after first deploy |
   | `CORS_ORIGINS` | `*` |
   | `GEMINI_API_KEY` | Your Gemini key from Step 3 |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |

5. Click **Deploy**. Wait 2-3 minutes.
6. Once deployed, Vercel gives you a URL like `https://careerlens-xyz.vercel.app`.
7. Go to **Project Settings → Environment Variables** → set `NEXT_PUBLIC_BASE_URL` to your Vercel URL (no trailing slash).
8. Go to **Deployments** → click "..." on the latest deployment → **Redeploy** (so the new env var takes effect).

---

## Step 5 — Test the live app

1. Open your Vercel URL in a browser.
2. Click "Analyze My Resume", paste a resume + job description, hit "Analyze Resume".
3. You should see the full report in ~10-30 seconds.
4. Try "Rewrite My Resume", "Generate Cover Letter", and "Find Matching Jobs".

✅ Done!

---

## Optional — Custom domain

In Vercel, go to **Project Settings → Domains** → add your domain. Follow the DNS instructions. After the cert provisions (~5 min), your app is at `https://careerlens.yourdomain.com`.

---

## Cost monitoring

- **Vercel**: free tier — 100 GB bandwidth / month, unlimited builds. Should be free forever for low traffic.
- **MongoDB Atlas M0**: free forever — 512 MB storage. Enough for ~10,000 resume analyses.
- **Gemini API free tier**: 1,500 requests per day per model (gemini-2.5-flash). Plenty for personal/early-stage use. If you exceed, upgrade to pay-as-you-go (~$0.30 per 1M tokens).

---

## Troubleshooting

**"MongoServerError: bad auth"** → wrong password in MONGO_URL. Re-copy from Atlas.

**"MongoNetworkError"** → Atlas Network Access doesn't allow Vercel IPs. Set to `0.0.0.0/0`.

**"Gemini API error: quota exceeded"** → you hit daily free limit. Wait 24h or enable billing on Google Cloud.

**Resume analysis falls back to heuristic** → check Vercel logs (`vercel logs`). If Gemini errors out repeatedly, your project may need billing enabled or a fresh API key from a new project.

**"Failed to parse file"** → some scanned PDFs have no text layer. Tell users to paste text instead.

---

## Updating later

```bash
git add .
git commit -m "Update something"
git push origin main
```

Vercel automatically redeploys on every push to `main`. No CLI needed.
