"""Keyword search over local policy markdown files (no vector DB)."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any


def search_hr_policies(policies_dir: Path, query: str, max_results: int = 8) -> list[dict[str, Any]]:
    hr_dir = policies_dir / "hr"
    if not hr_dir.is_dir():
        return []
    return _search_dir(hr_dir, policies_dir, query, max_results)


def read_travel_guidelines(policies_dir: Path, section: str | None = None) -> dict[str, Any]:
    path = policies_dir / "travel_guidelines.md"
    if not path.is_file():
        return {"found": False, "error": "travel_guidelines.md not found"}

    content = path.read_text(encoding="utf-8")
    if not section:
        return {"found": True, "path": "policies/travel_guidelines.md", "content": content}

    section_key = section.lower().replace("_", " ").strip()
    parts = re.split(r"\n##\s+", content)
    for part in parts:
        heading = part.split("\n", 1)[0].lower()
        if section_key in heading or heading.startswith(section_key):
            return {
                "found": True,
                "section": section,
                "content": "## " + part.strip(),
            }
    return {
        "found": True,
        "path": "policies/travel_guidelines.md",
        "content": content,
        "note": f"Section '{section}' not found; returning full document.",
    }


def _search_dir(
    search_root: Path, policies_dir: Path, query: str, max_results: int
) -> list[dict[str, Any]]:
    query_lower = query.lower().strip()
    terms = [t for t in re.split(r"\s+", query_lower) if len(t) > 2] or [query_lower]

    hits: list[dict[str, Any]] = []
    for path in sorted(search_root.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        text_lower = text.lower()
        score = sum(text_lower.count(t) for t in terms)
        if score == 0:
            continue
        hits.append(
            {
                "document": path.name,
                "path": str(path.relative_to(policies_dir.parent)),
                "score": score,
                "snippet": _snippet(text, terms),
            }
        )
    hits.sort(key=lambda x: x["score"], reverse=True)
    return hits[:max_results]


def _snippet(text: str, terms: list[str], window: int = 300) -> str:
    text_lower = text.lower()
    positions = [text_lower.find(t) for t in terms if text_lower.find(t) >= 0]
    pos = min(positions) if positions else 0
    start = max(0, pos - 40)
    end = min(len(text), start + window)
    out = text[start:end].strip()
    if start > 0:
        out = "…" + out
    if end < len(text):
        out = out + "…"
    return out
