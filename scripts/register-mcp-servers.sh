#!/usr/bin/env bash
# Register both MCP servers with Hermes (run from repo root).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/backend/.venv/bin/python"
export DATA_DIR="$ROOT/data"
export SQLITE_PATH="$ROOT/data/analysis.db"

register() {
  local name="$1"
  local script="$2"
  echo "Registering $name..."
  printf 'Y\nY\n' | hermes mcp add "$name" \
    --command "$PY" \
    --args "$script" \
    --env "DATA_DIR=$DATA_DIR" \
    --env "SQLITE_PATH=$SQLITE_PATH"
}

remove_mcp() {
  printf 'Y\n' | hermes mcp remove "$1" 2>/dev/null || true
}

remove_mcp business-data
remove_mcp company-knowledge

register business-data "$ROOT/backend/mcp_servers/business_data.py"
register company-knowledge "$ROOT/backend/mcp_servers/company_knowledge.py"

echo "Done. Restart: hermes gateway run --replace"
