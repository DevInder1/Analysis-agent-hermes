"""Shared grid payload helper for MCP tools and REST API."""

from __future__ import annotations

from typing import Any


def to_grid(columns: list[dict[str, str]], rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {"columns": columns, "rows": rows}
