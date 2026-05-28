#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
source .venv/bin/activate
export DATA_DIR="$ROOT/data"
export SQLITE_PATH="$ROOT/data/analysis.db"
echo "Local API → http://127.0.0.1:8002"
exec uvicorn api.local_api:app --host 127.0.0.1 --port 8002 --reload
