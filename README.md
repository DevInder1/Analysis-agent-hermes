# Analysis Agent — Enterprise Knowledge Worker (No-RAG)

Monorepo: **FastMCP** tools + **Hermes Agent** (local **Gemma 4**) + **Angular 20** dashboard.  
Data is stored **locally in SQLite** now; swap to **PostgreSQL** later via `DATABASE_URL` (same tool/API surface).

## Structure

```
analysis-agent/
├── data/analysis.db              # Local SQLite (gitignored)
├── data/*.csv                    # Seed data
├── backend/
│   ├── data_store/               # Repository abstraction (SQLite → Postgres)
│   ├── mcp_servers/business_data.py
│   └── api/local_api.py          # REST for dashboard pages
├── frontend/enterprise-dashboard/
└── scripts/
```

## Mock data (testing)

```bash
bash scripts/reset-mock-data.sh   # reload 20 projects, 40 employees, 23 appraisals, notes
```

Details: [data/README.md](data/README.md)

## Run everything (3 terminals)

### Terminal 1 — Local data API (SQLite)

```bash
bash scripts/init-local-db.sh          # once
bash scripts/start-local-api.sh      # http://127.0.0.1:8002
```

### Terminal 2 — Hermes + Ollama

```bash
bash scripts/start-hermes-gateway.sh
```

Re-register MCP after tool changes:

```bash
bash scripts/register-mcp-servers.sh
# then restart gateway: hermes gateway run --replace
```

### Terminal 3 — Angular UI

```bash
cd frontend/enterprise-dashboard && npm start
```

Open http://localhost:4200

| Page | What it does |
|------|----------------|
| **Chat** | Hermes SSE + AG Grid from agent replies |
| **Vulnerabilities** | Stored OSV scans, run scan, filter severity |
| **HR Analytics** | Training vs completion charts (40 employees) |
| **Appraisals** | 2026 cycle — pending self/manager + completed |

Proxies (`proxy.conf.mjs`): `/hermes-api` → 8642. Local API uses `http://127.0.0.1:8002` directly (CORS enabled).

## MCP tools

### `business-data`
| Tool | Description |
|------|-------------|
| `get_project_status` | Projects (filter by status, min_budget) |
| `update_project_status` | Update project status |
| `add_project_note` / `list_project_notes` | Project notes |
| `analyze_employee_data` | HR training analytics |
| `check_vulnerabilities` | OSV scan + persist |
| `get_stored_vulnerabilities` | Saved findings |

### `company-knowledge`
| Tool | Description |
|------|-------------|
| `query_budget_status` | Budget, travel %, remaining, alerts |
| `search_hr_policies` | Keyword search over `data/policies/hr/*.md` |
| `read_travel_guidelines` | Travel policy (optional section) |
| `get_appraisal_status` | Employee appraisal record |
| `list_pending_appraisals` | Open appraisal workflows |
| `submit_appraisal_self` | Employee self-assessment |
| `submit_manager_review` | Manager rating (1–5) + feedback |
| `start_appraisal_cycle` | Enroll all employees (HR admin) |

Register both servers: `bash scripts/register-mcp-servers.sh`

Policy documents live in `data/policies/` (editable markdown, no RAG).

## PostgreSQL later

Set `DATABASE_URL=postgresql://...` and implement `PostgresDataStore` in `backend/data_store/` — tools and REST API stay the same.

## Environment

Copy `.env.example` to `.env`. Key vars:

- `SQLITE_PATH=./data/analysis.db`
- `DATA_DIR=./data`
- `API_SERVER_KEY` (Hermes) must match `frontend/.../environment.ts`
