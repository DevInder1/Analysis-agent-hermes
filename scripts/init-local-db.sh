#!/usr/bin/env bash
# Create DB if missing; use reset-mock-data.sh to reload CSVs into existing DB
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
source .venv/bin/activate
pip install -q -r requirements.txt
export DATA_DIR="$ROOT/data"
export SQLITE_PATH="$ROOT/data/analysis.db"

if [ ! -f "$SQLITE_PATH" ]; then
  echo "No database found — loading mock data..."
  bash "$ROOT/scripts/reset-mock-data.sh"
else
  python -c "
from data_store import get_store
s = get_store()
print(f'DB exists ({s.backend_name()}): $SQLITE_PATH')
print('Projects:', len(s.list_projects(limit=50)))
print('To reload CSVs: bash scripts/reset-mock-data.sh')
"
fi
