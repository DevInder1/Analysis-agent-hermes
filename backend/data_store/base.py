"""Data store abstraction — SQLite now, PostgreSQL later via DATABASE_URL."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class DataStore(ABC):
    @abstractmethod
    def init_schema(self) -> None: ...

    @abstractmethod
    def seed_from_csv_if_empty(self, data_dir: str) -> None: ...

    @abstractmethod
    def list_projects(
        self,
        limit: int = 10,
        status: str | None = None,
        min_budget: float | None = None,
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    def update_project_status(self, name: str, status: str) -> dict[str, Any]: ...

    @abstractmethod
    def add_project_note(self, project_name: str, note: str) -> dict[str, Any]: ...

    @abstractmethod
    def list_project_notes(self, project_name: str | None = None) -> list[dict[str, Any]]: ...

    @abstractmethod
    def employee_analytics(self) -> dict[str, Any]: ...

    @abstractmethod
    def save_vulnerability_scan(
        self,
        findings: list[dict[str, Any]],
        scanned_python: int,
        scanned_npm: int,
    ) -> dict[str, Any]: ...

    @abstractmethod
    def list_vulnerability_findings(
        self,
        severity: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    def list_vulnerability_scans(self, limit: int = 10) -> list[dict[str, Any]]: ...

    @abstractmethod
    def query_budget_status(
        self,
        project_name: str | None = None,
        over_budget_travel_only: bool = False,
        limit: int = 20,
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    def get_appraisal_status(self, employee_id: str, cycle: str = "2026-annual") -> dict[str, Any]: ...

    @abstractmethod
    def list_pending_appraisals(
        self, status: str | None = None, limit: int = 50
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    def submit_appraisal_self(
        self,
        employee_id: str,
        goals: str,
        accomplishments: str,
        cycle: str = "2026-annual",
    ) -> dict[str, Any]: ...

    @abstractmethod
    def submit_manager_review(
        self,
        employee_id: str,
        rating: int,
        feedback: str,
        cycle: str = "2026-annual",
    ) -> dict[str, Any]: ...

    @abstractmethod
    def start_appraisal_cycle(self, cycle: str, year: int) -> dict[str, Any]: ...

    @abstractmethod
    def backend_name(self) -> str: ...
