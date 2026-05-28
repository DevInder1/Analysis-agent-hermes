"""SQLite implementation — local file DB until PostgreSQL is wired."""

from __future__ import annotations

import csv
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from .base import DataStore


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SQLiteDataStore(DataStore):
    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def backend_name(self) -> str:
        return "sqlite"

    def init_schema(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    budget REAL NOT NULL,
                    travel_expense REAL NOT NULL,
                    status TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL UNIQUE,
                    department TEXT,
                    training_hours REAL NOT NULL,
                    project_completion_rate REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_name TEXT NOT NULL,
                    note TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS vulnerability_scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scanned_at TEXT NOT NULL,
                    scanned_python INTEGER NOT NULL,
                    scanned_npm INTEGER NOT NULL,
                    finding_count INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS vulnerability_findings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_id INTEGER NOT NULL,
                    package TEXT NOT NULL,
                    version TEXT,
                    ecosystem TEXT,
                    severity TEXT NOT NULL,
                    osv_id TEXT,
                    summary TEXT,
                    FOREIGN KEY (scan_id) REFERENCES vulnerability_scans(id)
                );
                CREATE TABLE IF NOT EXISTS appraisals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    cycle TEXT NOT NULL,
                    status TEXT NOT NULL,
                    self_goals TEXT,
                    self_accomplishments TEXT,
                    manager_rating INTEGER,
                    manager_feedback TEXT,
                    updated_at TEXT NOT NULL,
                    UNIQUE(employee_id, cycle)
                );
                """
            )

    def seed_from_csv_if_empty(self, data_dir: str) -> None:
        root = Path(data_dir)
        with self._conn() as conn:
            count = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
            if count > 0:
                return

            projects_csv = root / "projects.csv"
            if projects_csv.is_file():
                with projects_csv.open(encoding="utf-8") as f:
                    for row in csv.DictReader(f):
                        conn.execute(
                            """
                            INSERT INTO projects (name, budget, travel_expense, status, updated_at)
                            VALUES (?, ?, ?, ?, ?)
                            """,
                            (
                                row["name"],
                                float(row["budget"]),
                                float(row["travel_expense"]),
                                row["status"],
                                _utc_now(),
                            ),
                        )

            employees_csv = root / "employees.csv"
            if employees_csv.is_file():
                with employees_csv.open(encoding="utf-8") as f:
                    for row in csv.DictReader(f):
                        conn.execute(
                            """
                            INSERT INTO employees
                            (employee_id, department, training_hours, project_completion_rate)
                            VALUES (?, ?, ?, ?)
                            """,
                            (
                                row["employee_id"],
                                row.get("department", ""),
                                float(row["training_hours"]),
                                float(row["project_completion_rate"]),
                            ),
                        )

            self._seed_project_notes_from_csv(conn, root)
            self._seed_appraisals_from_csv(conn, root)

    def _seed_project_notes_from_csv(self, conn: sqlite3.Connection, root: Path) -> None:
        path = root / "project_notes.csv"
        if not path.is_file():
            return
        count = conn.execute("SELECT COUNT(*) FROM project_notes").fetchone()[0]
        if count > 0:
            return
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                conn.execute(
                    """
                    INSERT INTO project_notes (project_name, note, created_at)
                    VALUES (?, ?, ?)
                    """,
                    (row["project_name"], row["note"], _utc_now()),
                )

    def _seed_appraisals_from_csv(self, conn: sqlite3.Connection, root: Path) -> None:
        count = conn.execute("SELECT COUNT(*) FROM appraisals").fetchone()[0]
        if count > 0:
            return
        path = root / "appraisals.csv"
        if path.is_file():
            with path.open(encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    conn.execute(
                        """
                        INSERT INTO appraisals
                        (employee_id, cycle, status, self_goals, self_accomplishments,
                         manager_rating, manager_feedback, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            row["employee_id"],
                            row.get("cycle") or "2026-annual",
                            row["status"],
                            row.get("self_goals") or None,
                            row.get("self_accomplishments") or None,
                            int(row["manager_rating"]) if row.get("manager_rating") else None,
                            row.get("manager_feedback") or None,
                            _utc_now(),
                        ),
                    )
            return
        employees = conn.execute("SELECT employee_id FROM employees LIMIT 10").fetchall()
        for i, row in enumerate(employees):
            eid = row[0]
            status = ["pending_self", "pending_manager", "completed"][i % 3]
            conn.execute(
                """
                INSERT INTO appraisals (employee_id, cycle, status, updated_at)
                VALUES (?, '2026-annual', ?, ?)
                """,
                (eid, status, _utc_now()),
            )

    def list_projects(
        self,
        limit: int = 10,
        status: str | None = None,
        min_budget: float | None = None,
    ) -> list[dict[str, Any]]:
        query = "SELECT name, budget, travel_expense, status, updated_at FROM projects WHERE 1=1"
        params: list[Any] = []
        if status:
            query += " AND status = ?"
            params.append(status)
        if min_budget is not None:
            query += " AND budget >= ?"
            params.append(min_budget)
        query += " ORDER BY budget DESC LIMIT ?"
        params.append(max(1, min(limit, 50)))

        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

    def update_project_status(self, name: str, status: str) -> dict[str, Any]:
        with self._conn() as conn:
            cur = conn.execute(
                "UPDATE projects SET status = ?, updated_at = ? WHERE name = ?",
                (status, _utc_now(), name),
            )
            if cur.rowcount == 0:
                return {"ok": False, "error": f"Project not found: {name}"}
            row = conn.execute(
                "SELECT name, budget, travel_expense, status, updated_at FROM projects WHERE name = ?",
                (name,),
            ).fetchone()
        return {"ok": True, "project": dict(row) if row else None}

    def add_project_note(self, project_name: str, note: str) -> dict[str, Any]:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO project_notes (project_name, note, created_at) VALUES (?, ?, ?)",
                (project_name, note, _utc_now()),
            )
            note_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        return {"ok": True, "id": note_id, "project_name": project_name, "note": note}

    def list_project_notes(self, project_name: str | None = None) -> list[dict[str, Any]]:
        with self._conn() as conn:
            if project_name:
                rows = conn.execute(
                    """
                    SELECT id, project_name, note, created_at FROM project_notes
                    WHERE project_name = ? ORDER BY created_at DESC
                    """,
                    (project_name,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT id, project_name, note, created_at FROM project_notes ORDER BY created_at DESC LIMIT 50"
                ).fetchall()
        return [dict(r) for r in rows]

    def employee_analytics(self) -> dict[str, Any]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT employee_id, department, training_hours, project_completion_rate FROM employees"
            ).fetchall()
        if not rows:
            return {"overall": {}, "summary": [], "employees": []}

        df = pd.DataFrame([dict(r) for r in rows])
        df["training_bucket"] = pd.cut(
            df["training_hours"],
            bins=[0, 16, 32, 48, 100],
            labels=["0-16h", "17-32h", "33-48h", "49h+"],
            include_lowest=True,
        )
        grouped = (
            df.groupby("training_bucket", observed=True)["project_completion_rate"]
            .agg(["mean", "count"])
            .reset_index()
        )
        grouped.columns = ["training_bucket", "avg_completion_rate", "employee_count"]
        summary = grouped.to_dict(orient="records")

        return {
            "overall": {
                "mean_training_hours": float(df["training_hours"].mean()),
                "mean_completion_rate": float(df["project_completion_rate"].mean()),
                "total_employees": int(len(df)),
            },
            "summary": summary,
            "chart": {
                "labels": [s["training_bucket"] for s in summary],
                "values": [float(s["avg_completion_rate"]) for s in summary],
            },
        }

    def save_vulnerability_scan(
        self,
        findings: list[dict[str, Any]],
        scanned_python: int,
        scanned_npm: int,
    ) -> dict[str, Any]:
        scanned_at = _utc_now()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO vulnerability_scans
                (scanned_at, scanned_python, scanned_npm, finding_count)
                VALUES (?, ?, ?, ?)
                """,
                (scanned_at, scanned_python, scanned_npm, len(findings)),
            )
            scan_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            for f in findings:
                conn.execute(
                    """
                    INSERT INTO vulnerability_findings
                    (scan_id, package, version, ecosystem, severity, osv_id, summary)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        scan_id,
                        f.get("package", ""),
                        f.get("version", ""),
                        f.get("ecosystem", ""),
                        f.get("severity", "unknown"),
                        f.get("id", f.get("osv_id", "")),
                        f.get("summary", ""),
                    ),
                )
        return {
            "scan_id": scan_id,
            "scanned_at": scanned_at,
            "finding_count": len(findings),
        }

    def list_vulnerability_findings(
        self,
        severity: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        query = """
            SELECT f.package, f.version, f.ecosystem, f.severity, f.osv_id, f.summary, s.scanned_at
            FROM vulnerability_findings f
            JOIN vulnerability_scans s ON s.id = f.scan_id
            WHERE 1=1
        """
        params: list[Any] = []
        if severity:
            query += " AND f.severity = ?"
            params.append(severity.lower())
        query += """
            ORDER BY CASE f.severity
                WHEN 'critical' THEN 0 WHEN 'high' THEN 1
                WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
            f.package
            LIMIT ?
        """
        params.append(limit)
        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

    def list_vulnerability_scans(self, limit: int = 10) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT id, scanned_at, scanned_python, scanned_npm, finding_count
                FROM vulnerability_scans ORDER BY id DESC LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

    def query_budget_status(
        self,
        project_name: str | None = None,
        over_budget_travel_only: bool = False,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        projects = self.list_projects(limit=50)
        rows: list[dict[str, Any]] = []
        for p in projects:
            if project_name and project_name.lower() not in p["name"].lower():
                continue
            budget = float(p["budget"])
            travel = float(p["travel_expense"])
            travel_pct = round((travel / budget * 100) if budget else 0, 2)
            remaining = round(budget - travel, 2)
            travel_flag = travel_pct > 5.0 or p["status"] == "At Risk"
            row = {
                "name": p["name"],
                "budget": budget,
                "travel_expense": travel,
                "travel_pct_of_budget": travel_pct,
                "budget_remaining": remaining,
                "status": p["status"],
                "travel_budget_alert": travel_flag,
            }
            if over_budget_travel_only and not travel_flag:
                continue
            rows.append(row)
        rows.sort(key=lambda x: x["travel_pct_of_budget"], reverse=True)
        return rows[:limit]

    def get_appraisal_status(self, employee_id: str, cycle: str = "2026-annual") -> dict[str, Any]:
        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT employee_id, cycle, status, self_goals, self_accomplishments,
                       manager_rating, manager_feedback, updated_at
                FROM appraisals WHERE employee_id = ? AND cycle = ?
                """,
                (employee_id, cycle),
            ).fetchone()
        if not row:
            return {"found": False, "employee_id": employee_id, "cycle": cycle}
        return {"found": True, **dict(row)}

    def list_all_appraisals(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT a.employee_id, e.department, a.cycle, a.status, a.manager_rating, a.updated_at
                FROM appraisals a
                LEFT JOIN employees e ON e.employee_id = a.employee_id
                ORDER BY a.status, a.employee_id LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

    def list_pending_appraisals(
        self, status: str | None = None, limit: int = 50
    ) -> list[dict[str, Any]]:
        query = """
            SELECT a.employee_id, e.department, a.cycle, a.status, a.manager_rating, a.updated_at
            FROM appraisals a
            LEFT JOIN employees e ON e.employee_id = a.employee_id
            WHERE a.status != 'completed'
        """
        params: list[Any] = []
        if status:
            query += " AND a.status = ?"
            params.append(status)
        query += " ORDER BY a.updated_at DESC LIMIT ?"
        params.append(limit)
        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

    def submit_appraisal_self(
        self,
        employee_id: str,
        goals: str,
        accomplishments: str,
        cycle: str = "2026-annual",
    ) -> dict[str, Any]:
        with self._conn() as conn:
            cur = conn.execute(
                """
                UPDATE appraisals
                SET self_goals = ?, self_accomplishments = ?, status = 'pending_manager', updated_at = ?
                WHERE employee_id = ? AND cycle = ?
                """,
                (goals, accomplishments, _utc_now(), employee_id, cycle),
            )
            if cur.rowcount == 0:
                conn.execute(
                    """
                    INSERT INTO appraisals
                    (employee_id, cycle, status, self_goals, self_accomplishments, updated_at)
                    VALUES (?, ?, 'pending_manager', ?, ?, ?)
                    """,
                    (employee_id, cycle, goals, accomplishments, _utc_now()),
                )
        return {"ok": True, "employee_id": employee_id, "status": "pending_manager"}

    def submit_manager_review(
        self,
        employee_id: str,
        rating: int,
        feedback: str,
        cycle: str = "2026-annual",
    ) -> dict[str, Any]:
        if rating < 1 or rating > 5:
            return {"ok": False, "error": "rating must be between 1 and 5"}
        with self._conn() as conn:
            cur = conn.execute(
                """
                UPDATE appraisals
                SET manager_rating = ?, manager_feedback = ?, status = 'completed', updated_at = ?
                WHERE employee_id = ? AND cycle = ?
                """,
                (rating, feedback, _utc_now(), employee_id, cycle),
            )
            if cur.rowcount == 0:
                return {"ok": False, "error": f"No appraisal record for {employee_id} in {cycle}"}
        return {"ok": True, "employee_id": employee_id, "status": "completed", "rating": rating}

    def start_appraisal_cycle(self, cycle: str, year: int) -> dict[str, Any]:
        created = 0
        with self._conn() as conn:
            employees = conn.execute("SELECT employee_id FROM employees").fetchall()
            for (eid,) in employees:
                try:
                    conn.execute(
                        """
                        INSERT INTO appraisals (employee_id, cycle, status, updated_at)
                        VALUES (?, ?, 'pending_self', ?)
                        """,
                        (eid, cycle, _utc_now()),
                    )
                    created += 1
                except sqlite3.IntegrityError:
                    pass
        return {"ok": True, "cycle": cycle, "year": year, "employees_enrolled": created}
