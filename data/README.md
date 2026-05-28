# Mock data for local testing

| File | Used for |
|------|----------|
| `projects.csv` | Budget analysis, travel expense alerts, project status |
| `employees.csv` | HR analytics (training vs completion by department) |
| `appraisals.csv` | Appraisal workflow (self, manager review, completed) |
| `project_notes.csv` | Project notes via MCP / future UI |
| `policies/hr/*.md` | `search_hr_policies` |
| `policies/travel_guidelines.md` | `read_travel_guidelines` |

## Reset database from CSVs

```bash
bash scripts/reset-mock-data.sh
```

This deletes `analysis.db` and reloads all CSV seeds.

## Budget / travel highlights (sample)

- **Nexus ERP Modernization** — $4.85M budget, $285k travel (~5.9%), **At Risk**
- **EMEA Market Expansion** — high travel vs budget, **At Risk**
- **IoT Factory Monitoring** — travel alert + At Risk status
- **Data Lake** / **Warehouse Upgrade** — **Delayed** status

## Appraisal statuses (2026-annual cycle)

- **completed** — e.g. E001, E004, E008, E013, E026
- **pending_manager** — self-assessment submitted, awaiting manager
- **pending_self** — not yet submitted

## Edit data

Change CSVs, then run `bash scripts/reset-mock-data.sh` again. No PostgreSQL required until production.
