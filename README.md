# ContriboFind

**Your skills. Your issues. Your first PR.**

<!-- Add screenshot here -->

ContriboFind is an AI-powered web app that helps developers find open source GitHub issues perfectly matched to their skill level.

- **AI-matched issues** — four LangGraph agents analyse your GitHub repos, search for issues, read codebases, and draft your intro comment
- **Personalised** — the skill analyser reads your public repos to understand your actual stack, not just what you claim
- **Ready to post** — each issue comes with an editable draft comment written in your voice

---

## Architecture

```
Browser (Next.js 14)
    │
    ├── GitHub OAuth (NextAuth.js)
    ├── Dashboard / Results / Saved / Learn pages
    │
    └── fetch() with Bearer token
            │
            ▼
    Python FastAPI (port 8000)
            │
            ├── SSE streaming via sse-starlette
            │
            └── LangGraph StateGraph pipeline
                    │
                    ├── Agent 1: Skill Analyser
                    │       └── GitHub MCP (list_repos, get_languages)
                    │
                    ├── Agent 2: Issue Finder
                    │       ├── GitHub MCP (search_issues)
                    │       └── Tavily web search
                    │
                    ├── Agent 3: Codebase Reader
                    │       └── GitHub MCP (get_readme, get_file_contents)
                    │
                    └── Agent 4: Intro Drafter
                            └── Groq (llama-3.3-70b-versatile)
```

---

## Tech Stack

**Backend (Python 3.11)**
- FastAPI + uvicorn
- LangGraph (StateGraph orchestration)
- LangChain Groq (llama-3.3-70b-versatile)
- MCP Python SDK (GitHub MCP server)
- Tavily Python SDK
- Supabase Python client
- sse-starlette (SSE streaming)

**Frontend (TypeScript)**
- Next.js 14 (App Router)
- NextAuth.js (GitHub OAuth)
- Tailwind CSS + next-themes (dark mode)
- Supabase JS client

---

## Agents

| Agent | What it does |
|-------|-------------|
| **Skill Analyser** | Reads your top 30 repos, calls Groq to build a skill profile: languages, frameworks, level (beginner/intermediate/advanced), domains |
| **Issue Finder** | Searches GitHub issues by label strategy + Tavily for trending OSS projects, uses Groq to rank top 5 matches |
| **Codebase Reader** | For each matched issue, reads the README + CONTRIBUTING.md + folder structure and writes a practical 2-3 sentence briefing |
| **Intro Drafter** | Writes a personalised, natural-sounding GitHub issue comment tailored to your background and the specific issue |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- pipenv (`pip install pipenv`)
- A GitHub OAuth App
- A Supabase project
- A Groq API key (free at console.groq.com)
- A Tavily API key (free at app.tavily.com)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/contribofind
cd contribofind
```

### 2. Set up the database

Go to your Supabase dashboard → SQL Editor, paste the contents of `backend/db/schema.sql`, and click Run.

### 3. Configure backend

```bash
cd backend
cp .env.example .env
# Fill in GROQ_API_KEY, TAVILY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

### 4. Configure frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in NEXTAUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**GitHub OAuth App settings:**
- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/auth/callback/github`

---

## Running locally

**Backend** (from `backend/` folder):
```bash
pipenv install
pipenv run uvicorn main:app --reload --port 8000
```

**Frontend** (from `frontend/` folder):
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Test the backend is up: `curl http://localhost:8000/health` → `{"status": "ok"}`

---

## Deployment

**Backend → Render**
1. Create a new Web Service on Render
2. Set root directory to `backend`
3. Build command: `pip install pipenv && pipenv install`
4. Start command: `pipenv run uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from `.env.example`
6. Set `FRONTEND_URL` to your Vercel deployment URL

**Frontend → Vercel**
1. Import the repo on Vercel
2. Set root directory to `frontend`
3. Add all environment variables from `.env.local.example`
4. Set `NEXT_PUBLIC_BACKEND_URL` to your Render backend URL
5. Update your GitHub OAuth App callback URL to your Vercel URL

---

## Project structure

```
contribofind/
├── backend/
│   ├── main.py              # FastAPI app, SSE endpoint
│   ├── agents/
│   │   ├── pipeline.py      # LangGraph StateGraph
│   │   ├── skill_analyser.py
│   │   ├── issue_finder.py
│   │   ├── codebase_reader.py
│   │   └── intro_drafter.py
│   ├── tools/
│   │   ├── github_mcp.py    # GitHub MCP client
│   │   └── tavily_search.py
│   ├── models/schemas.py    # AgentState TypedDict
│   └── db/
│       ├── supabase_client.py
│       └── schema.sql       # Run this in Supabase
└── frontend/
    └── src/
        ├── app/             # Next.js App Router pages
        └── components/      # Sidebar, IssueCard, AgentProgress, etc.
```
