"""OSV vulnerability scanning — shared by MCP tools and local API."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import httpx

_OSV_URL = "https://api.osv.dev/v1/query"


def parse_requirements(path: Path) -> list[tuple[str, str]]:
    if not path.is_file():
        return []
    pairs: list[tuple[str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([a-zA-Z0-9_.-]+)\s*(?:==|>=|<=|~=)\s*([^\s;#]+)", line)
        if match:
            pairs.append((match.group(1).lower(), match.group(2).strip()))
        elif re.match(r"^[a-zA-Z0-9_.-]+$", line):
            pairs.append((line.lower(), "*"))
    return pairs


def parse_package_json(path: Path) -> list[tuple[str, str]]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    deps: dict[str, str] = {}
    deps.update(data.get("dependencies") or {})
    deps.update(data.get("devDependencies") or {})
    result: list[tuple[str, str]] = []
    for name, version in deps.items():
        clean = re.sub(r"^[\^~>=<]+", "", str(version).strip())
        result.append((name, clean or "*"))
    return result


def query_osv(package: str, version: str, ecosystem: str) -> list[dict[str, Any]]:
    payload: dict[str, Any] = {"package": {"name": package, "ecosystem": ecosystem}}
    if version and version != "*":
        payload["version"] = version
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(_OSV_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError:
        return []

    findings: list[dict[str, Any]] = []
    for vuln in data.get("vulns") or []:
        severity = "unknown"
        for item in vuln.get("severity") or []:
            if item.get("type") == "CVSS_V3":
                score = item.get("score", "")
                if "CRITICAL" in score.upper() or score.startswith("9"):
                    severity = "critical"
                elif score.startswith("7") or score.startswith("8"):
                    severity = "high"
                elif score.startswith("4") or score.startswith("5") or score.startswith("6"):
                    severity = "medium"
                else:
                    severity = "low"
                break
        findings.append(
            {
                "package": package,
                "version": version,
                "ecosystem": ecosystem,
                "id": vuln.get("id", ""),
                "severity": severity,
                "summary": (vuln.get("summary") or vuln.get("details") or "")[:500],
            }
        )
    return findings


def run_dependency_scan(repo_root: Path) -> dict[str, Any]:
    backend_req = repo_root / "backend" / "requirements.txt"
    frontend_pkg = repo_root / "frontend" / "enterprise-dashboard" / "package.json"

    py_deps = parse_requirements(backend_req)
    npm_deps = parse_package_json(frontend_pkg)

    all_findings: list[dict[str, Any]] = []
    for pkg, ver in py_deps:
        all_findings.extend(query_osv(pkg, ver, "PyPI"))
    for pkg, ver in npm_deps:
        all_findings.extend(query_osv(pkg, ver, "npm"))

    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for f in all_findings:
        key = f"{f.get('id')}|{f.get('package')}"
        if key not in seen:
            seen.add(key)
            unique.append(f)

    unique.sort(
        key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3, "unknown": 4}.get(
            x.get("severity", "unknown"), 5
        )
    )
    return {
        "scanned_python": len(py_deps),
        "scanned_npm": len(npm_deps),
        "findings": unique,
        "finding_count": len(unique),
    }
