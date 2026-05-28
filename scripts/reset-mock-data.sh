#!/usr/bin/env bash
# Reset SQLite DB and load realistic mock CSVs from data/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="$ROOT/data/analysis.db"

echo "Removing existing database: $DB"
rm -f "$DB" "$DB-journal"

cd "$ROOT/backend"
source .venv/bin/activate
export DATA_DIR="$ROOT/data"
export SQLITE_PATH="$DB"

python -c "
from data_store import factory
factory.get_store.cache_clear()
from data_store import get_store
s = get_store()

projects = s.list_projects(limit=50)
budget = s.query_budget_status(limit=50)
pending = s.list_pending_appraisals()
all_appr = s.list_all_appraisals()
notes = s.list_project_notes()

print('--- Mock data loaded ---')
print(f'Projects:        {len(projects)}')
print(f'Employees:       {s.employee_analytics().get(\"overall\", {}).get(\"total_employees\", 0)}')
print(f'Budget rows:     {len(budget)}')
print(f'Travel alerts:   {sum(1 for r in budget if r[\"travel_budget_alert\"])}')
print(f'Project notes:   {len(notes)}')
print(f'Appraisals:      {len(all_appr)} (pending: {len(pending)})')
print(f'Completed:       {sum(1 for a in all_appr if a[\"status\"] == \"completed\")}')
"

echo ""
echo "Optional: run vulnerability scan to populate findings:"
echo "  curl -X POST http://127.0.0.1:8002/vulnerabilities/scan"
