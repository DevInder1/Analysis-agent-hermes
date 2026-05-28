"""Pick store backend: SQLite (default) or PostgreSQL when DATABASE_URL is set."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from .base import DataStore
from .sqlite_store import SQLiteDataStore

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_DB = _REPO_ROOT / "data" / "analysis.db"


@lru_cache(maxsize=1)
def get_store() -> DataStore:
    database_url = os.getenv("DATABASE_URL", "").strip()
    data_dir = os.getenv("DATA_DIR", str(_REPO_ROOT / "data"))

    if database_url.startswith("postgresql"):
        raise NotImplementedError(
            "PostgreSQL backend is planned for production. "
            "Unset DATABASE_URL to use local SQLite, or implement PostgresDataStore."
        )

    db_path = Path(os.getenv("SQLITE_PATH", _DEFAULT_DB))
    store: DataStore = SQLiteDataStore(db_path)
    store.init_schema()
    store.seed_from_csv_if_empty(data_dir)
    return store
