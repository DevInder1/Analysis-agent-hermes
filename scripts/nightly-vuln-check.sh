#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
source .venv/bin/activate
export DATA_DIR="$ROOT/data"
export SQLITE_PATH="$ROOT/data/analysis.db"
python -c "
import sys
sys.path.insert(0, '.')
from data_store import get_store
from mcp_servers.vuln_scan import run_dependency_scan
from pathlib import Path
store = get_store()
scan = run_dependency_scan(Path('$ROOT'))
meta = store.save_vulnerability_scan(scan['findings'], scan['scanned_python'], scan['scanned_npm'])
print('Scan saved:', meta)
"
