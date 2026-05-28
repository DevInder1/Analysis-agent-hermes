"""Local REST API for the Angular dashboard (reads/writes SQLite store)."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from data_store import get_store
from data_store.grid import to_grid
from data_store.policy_search import read_travel_guidelines, search_hr_policies
from mcp_servers.vuln_scan import run_dependency_scan

_REPO_ROOT = Path(__file__).resolve().parents[2]
_POLICIES_DIR = _REPO_ROOT / "data" / "policies"
store = get_store()

app = FastAPI(title="Analysis Agent Local API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "backend": store.backend_name()}


@app.get("/projects")
def list_projects(limit: int = 50, status: str | None = None, min_budget: float | None = None):
    rows = store.list_projects(limit=limit, status=status, min_budget=min_budget)
    return {"projects": rows, "grid": to_grid(
        [
            {"field": "name", "headerName": "Project"},
            {"field": "budget", "headerName": "Budget"},
            {"field": "travel_expense", "headerName": "Travel"},
            {"field": "status", "headerName": "Status"},
        ],
        rows,
    )}


class ProjectNoteBody(BaseModel):
    project_name: str
    note: str


@app.patch("/projects/{name}/status")
def patch_project_status(name: str, status: str = Query(...)):
    result = store.update_project_status(name, status)
    if not result.get("ok"):
        raise HTTPException(status_code=404, detail=result.get("error", "Not found"))
    return result


@app.get("/projects/notes")
def get_notes(project_name: str | None = None):
    return {"notes": store.list_project_notes(project_name)}


@app.post("/projects/notes")
def post_note(body: ProjectNoteBody):
    return store.add_project_note(body.project_name, body.note)


@app.get("/analytics/employees")
def employee_analytics():
    return store.employee_analytics()


@app.get("/vulnerabilities")
def list_vulns(severity: str | None = None, limit: int = 100):
    rows = store.list_vulnerability_findings(severity=severity, limit=limit)
    return {
        "findings": rows,
        "grid": to_grid(
            [
                {"field": "package", "headerName": "Package"},
                {"field": "version", "headerName": "Version"},
                {"field": "severity", "headerName": "Severity"},
                {"field": "osv_id", "headerName": "OSV ID"},
                {"field": "summary", "headerName": "Summary"},
                {"field": "scanned_at", "headerName": "Scanned"},
            ],
            [
                {
                    "package": r["package"],
                    "version": r["version"],
                    "severity": r["severity"],
                    "osv_id": r["osv_id"],
                    "summary": r["summary"],
                    "scanned_at": r["scanned_at"],
                }
                for r in rows
            ],
        ),
    }


@app.get("/vulnerabilities/scans")
def list_scans(limit: int = 10):
    return {"scans": store.list_vulnerability_scans(limit=limit)}


@app.post("/vulnerabilities/scan")
def run_scan():
    scan = run_dependency_scan(_REPO_ROOT)
    meta = store.save_vulnerability_scan(
        findings=scan["findings"],
        scanned_python=scan["scanned_python"],
        scanned_npm=scan["scanned_npm"],
    )
    return {**scan, "scan": meta}


@app.get("/budget/status")
def budget_status(
    project_name: str | None = None,
    over_budget_travel_only: bool = False,
    limit: int = 20,
):
    rows = store.query_budget_status(
        project_name=project_name,
        over_budget_travel_only=over_budget_travel_only,
        limit=limit,
    )
    return {
        "projects": rows,
        "grid": to_grid(
            [
                {"field": "name", "headerName": "Project"},
                {"field": "budget", "headerName": "Budget"},
                {"field": "travel_expense", "headerName": "Travel"},
                {"field": "travel_pct_of_budget", "headerName": "Travel %"},
                {"field": "budget_remaining", "headerName": "Remaining"},
                {"field": "status", "headerName": "Status"},
                {"field": "travel_budget_alert", "headerName": "Alert"},
            ],
            rows,
        ),
    }


@app.get("/policies/hr/search")
def hr_policy_search(q: str, max_results: int = 8):
    hits = search_hr_policies(_POLICIES_DIR, q, max_results=max_results)
    return {"results": hits}


@app.get("/policies/travel")
def travel_policy(section: str | None = None):
    return read_travel_guidelines(_POLICIES_DIR, section=section)


@app.get("/appraisals")
def list_appraisals(pending_only: bool = False, status: str | None = None):
    if pending_only:
        rows = store.list_pending_appraisals(status=status)
    else:
        rows = store.list_all_appraisals()
    return {"appraisals": rows}


@app.get("/appraisals/{employee_id}")
def appraisal_detail(employee_id: str, cycle: str = "2026-annual"):
    return store.get_appraisal_status(employee_id, cycle=cycle)


class AppraisalSelfBody(BaseModel):
    employee_id: str
    goals: str
    accomplishments: str
    cycle: str = "2026-annual"


class ManagerReviewBody(BaseModel):
    employee_id: str
    rating: int
    feedback: str
    cycle: str = "2026-annual"


@app.post("/appraisals/self")
def post_appraisal_self(body: AppraisalSelfBody):
    return store.submit_appraisal_self(
        body.employee_id, body.goals, body.accomplishments, cycle=body.cycle
    )


@app.post("/appraisals/manager-review")
def post_manager_review(body: ManagerReviewBody):
    return store.submit_manager_review(
        body.employee_id, body.rating, body.feedback, cycle=body.cycle
    )
