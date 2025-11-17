# Fizz

Fizz is a lightweight Jira-like agile workspace prototype. It supports organizations, projects, sprints/spikes, issues, subtasks, boards, backlogs, calendars, timelines, forms, goals, and tight GitHub + Vercel integration.

---

## Features
- Create & manage **organizations** (owner/CEO invites members)
- **Projects → Sprints → Issues** (task, story, bug, epic, subtask, spike)
- **Nested subtasks** (max 2 levels)
- **Multiple assignees**, watchers, labels, priority levels
- **Kanban board** with drag-and-drop + WIP limits
- **Backlog** reorder, sprint planning
- **Calendar** and **timeline** (Gantt-like) views
- **Goals** and **custom forms**
- **GitHub integration**: branch → issue linking, PR events update issue status
- **Vercel integration**: preview URLs auto-attached to issues
- Webhooks, OAuth, real-time board updates

---

## Repository Structure
/fizz
/backend # API, DB, webhooks
/frontend # React + Vite UI
docker-compose.yml
lovable-prompt.json
README.md

---

## Requirements
- Node.js 18+
- npm / pnpm / yarn
- PostgreSQL 13+
- Git
- (Optional) Docker for DB

---

## Environment Setup

### backend/.env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://fizz_user:password@localhost:5432/fizz_dev
JWT_SECRET=super-secret-jwt-key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:4000/auth/github/callback

WEBHOOK_SECRET=your-webhook-secret

### frontend/.env
VITE_API_URL=http://localhost:4000/api

VITE_GITHUB_OAUTH_URL=https://github.com/login/oauth/authorize?client_id=your_github_client_id

---

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/fizz.git
cd fizz
docker-compose up -d
cd backend
npm install
npm run dev
cd frontend
npm install
npm run dev
```

### Troubleshooting

OAuth redirect errors → check GitHub callback URL

Missing previews → ensure Vercel webhook includes meta.branch

Webhook signature invalid → verify WEBHOOK_SECRET

DB connection errors → ensure Postgres is running & DATABASE_URL is correct
