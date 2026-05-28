"""FastMCP server — company data + vulnerabilities (local SQLite, PostgreSQL later)."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastmcp import FastMCP

# Allow imports from backend package root
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from data_store import get_store
from data_store.grid import to_grid
from mcp_servers.vuln_scan import run_dependency_scan

load_dotenv()

mcp = FastMCP("business-data")
_REPO_ROOT = Path(__file__).resolve().parents[2]
store = get_store()


@mcp.tool()
def get_project_status(
    limit: int = 10,
    status: str | None = None,
    min_budget: float | None = None,
) -> dict[str, Any]:
    """Return company projects with budgets and travel expenses from the local store."""
    projects = store.list_projects(limit=limit, status=status, min_budget=min_budget)
    return {
        "backend": store.backend_name(),
        "projects": projects,
        "count": len(projects),
        "grid": to_grid(
            [
                {"field": "name", "headerName": "Project"},
                {"field": "budget", "headerName": "Budget"},
                {"field": "travel_expense", "headerName": "Travel"},
                {"field": "status", "headerName": "Status"},
            ],
            projects,
        ),
    }


@mcp.tool()
def update_project_status(name: str, status: str) -> dict[str, Any]:
    """Update a project's status in the local store (e.g. On Track, At Risk, Delayed)."""
    return store.update_project_status(name, status)


@mcp.tool()
def add_project_note(project_name: str, note: str) -> dict[str, Any]:
    """Save a note against a project in the local store."""
    return store.add_project_note(project_name, note)


@mcp.tool()
def list_project_notes(project_name: str | None = None) -> dict[str, Any]:
    """List saved project notes from the local store."""
    notes = store.list_project_notes(project_name)
    return {
        "notes": notes,
        "count": len(notes),
        "grid": to_grid(
            [
                {"field": "project_name", "headerName": "Project"},
                {"field": "note", "headerName": "Note"},
                {"field": "created_at", "headerName": "Created"},
            ],
            notes,
        ),
    }


@mcp.tool()
def analyze_employee_data() -> dict[str, Any]:
    """Training hours vs completion rate analytics from the local store."""
    result = store.employee_analytics()
    summary = result.get("summary", [])
    return {
        "backend": store.backend_name(),
        **result,
        "grid": to_grid(
            [
                {"field": "training_bucket", "headerName": "Training bucket"},
                {"field": "avg_completion_rate", "headerName": "Avg completion"},
                {"field": "employee_count", "headerName": "Employees"},
            ],
            summary,
        ),
    }


@mcp.tool()
def check_vulnerabilities(persist: bool = True) -> dict[str, Any]:
    """Scan dependencies via OSV; optionally persist results to the local store."""
    scan = run_dependency_scan(_REPO_ROOT)
    findings = scan["findings"][:50]

    scan_meta: dict[str, Any] = {}
    if persist:
        scan_meta = store.save_vulnerability_scan(
            findings=scan["findings"],
            scanned_python=scan["scanned_python"],
            scanned_npm=scan["scanned_npm"],
        )

    rows = [
        {
            "package": f["package"],
            "version": f["version"],
            "severity": f["severity"],
            "id": f["id"],
            "summary": f["summary"],
        }
        for f in findings
    ]

    return {
        "backend": store.backend_name(),
        "scanned_python": scan["scanned_python"],
        "scanned_npm": scan["scanned_npm"],
        "finding_count": scan["finding_count"],
        "findings": findings,
        "scan": scan_meta,
        "grid": to_grid(
            [
                {"field": "package", "headerName": "Package"},
                {"field": "version", "headerName": "Version"},
                {"field": "severity", "headerName": "Severity"},
                {"field": "id", "headerName": "CVE/OSV ID"},
                {"field": "summary", "headerName": "Summary"},
            ],
            rows,
        ),
    }


@mcp.tool()
def get_stored_vulnerabilities(severity: str | None = None, limit: int = 50) -> dict[str, Any]:
    """Return vulnerability findings from the last saved scans in the local store."""
    findings = store.list_vulnerability_findings(severity=severity, limit=limit)
    rows = [
        {
            "package": f["package"],
            "version": f["version"],
            "severity": f["severity"],
            "osv_id": f["osv_id"],
            "summary": f["summary"],
            "scanned_at": f["scanned_at"],
        }
        for f in findings
    ]
    return {
        "findings": findings,
        "count": len(findings),
        "grid": to_grid(
            [
                {"field": "package", "headerName": "Package"},
                {"field": "version", "headerName": "Version"},
                {"field": "severity", "headerName": "Severity"},
                {"field": "osv_id", "headerName": "OSV ID"},
                {"field": "summary", "headerName": "Summary"},
            ],
            rows,
        ),
    }


if __name__ == "__main__":
    mcp.run()
