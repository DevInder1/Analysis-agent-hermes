"""MCP tools: budget, HR policies, travel guidelines, appraisals."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastmcp import FastMCP

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from data_store import get_store
from data_store.grid import to_grid
from data_store.policy_search import read_travel_guidelines as load_travel_guidelines
from data_store.policy_search import search_hr_policies as search_hr_docs

load_dotenv()

mcp = FastMCP("company-knowledge")
_REPO_ROOT = Path(__file__).resolve().parents[2]
_DATA_DIR = Path(os.getenv("DATA_DIR", _REPO_ROOT / "data")).resolve()
_POLICIES_DIR = _DATA_DIR / "policies"
store = get_store()


@mcp.tool()
def query_budget_status(
    project_name: str | None = None,
    over_budget_travel_only: bool = False,
    limit: int = 20,
) -> dict[str, Any]:
    """Query project budget health: spend, travel % of budget, remaining budget, alerts."""
    rows = store.query_budget_status(
        project_name=project_name,
        over_budget_travel_only=over_budget_travel_only,
        limit=limit,
    )
    total_budget = sum(r["budget"] for r in rows)
    total_travel = sum(r["travel_expense"] for r in rows)
    return {
        "projects": rows,
        "count": len(rows),
        "summary": {
            "total_budget": total_budget,
            "total_travel": total_travel,
            "alerts": sum(1 for r in rows if r["travel_budget_alert"]),
        },
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


@mcp.tool()
def search_hr_policies(query: str, max_results: int = 5) -> dict[str, Any]:
    """Search HR policy documents (leave, remote work, appraisals, conduct) by keyword."""
    hits = search_hr_docs(_POLICIES_DIR, query, max_results=max_results)
    return {
        "query": query,
        "result_count": len(hits),
        "results": hits,
        "grid": to_grid(
            [
                {"field": "document", "headerName": "Document"},
                {"field": "path", "headerName": "Path"},
                {"field": "score", "headerName": "Relevance"},
                {"field": "snippet", "headerName": "Snippet"},
            ],
            hits,
        ),
    }


@mcp.tool()
def read_travel_guidelines(section: str | None = None) -> dict[str, Any]:
    """Read corporate travel guidelines. Optional section: pre-approval, per_diem, expense_reporting, budget_alignment."""
    return load_travel_guidelines(_POLICIES_DIR, section=section)


@mcp.tool()
def get_appraisal_status(employee_id: str, cycle: str = "2026-annual") -> dict[str, Any]:
    """Get appraisal status for an employee in a given cycle."""
    return store.get_appraisal_status(employee_id, cycle=cycle)


@mcp.tool()
def list_pending_appraisals(status: str | None = None) -> dict[str, Any]:
    """List appraisals not yet completed. Status: pending_self, pending_manager."""
    rows = store.list_pending_appraisals(status=status)
    return {
        "appraisals": rows,
        "count": len(rows),
        "grid": to_grid(
            [
                {"field": "employee_id", "headerName": "Employee"},
                {"field": "department", "headerName": "Department"},
                {"field": "cycle", "headerName": "Cycle"},
                {"field": "status", "headerName": "Status"},
                {"field": "updated_at", "headerName": "Updated"},
            ],
            rows,
        ),
    }


@mcp.tool()
def submit_appraisal_self(
    employee_id: str,
    goals: str,
    accomplishments: str,
    cycle: str = "2026-annual",
) -> dict[str, Any]:
    """Submit employee self-assessment for the appraisal cycle."""
    return store.submit_appraisal_self(employee_id, goals, accomplishments, cycle=cycle)


@mcp.tool()
def submit_manager_review(
    employee_id: str,
    rating: int,
    feedback: str,
    cycle: str = "2026-annual",
) -> dict[str, Any]:
    """Submit manager review and rating (1-5) for an employee appraisal."""
    return store.submit_manager_review(employee_id, rating, feedback, cycle=cycle)


@mcp.tool()
def start_appraisal_cycle(cycle: str = "2026-annual", year: int = 2026) -> dict[str, Any]:
    """Enroll all employees in a new appraisal cycle (HR admin)."""
    return store.start_appraisal_cycle(cycle, year)


if __name__ == "__main__":
    mcp.run()
