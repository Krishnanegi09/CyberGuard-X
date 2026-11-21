import os
import sys
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

dotenv_path = ROOT / ".env"
if dotenv_path.exists():
    vals = dotenv_values(dotenv_path)
    for k, v in vals.items():
        if k not in os.environ and v is not None:
            os.environ[k] = v

# Ensure test DB is always used in tests (safely override local dev DB if loaded from .env)
if "DATABASE_URL" not in os.environ or os.environ["DATABASE_URL"].endswith("/cyberguard_x"):
    os.environ["DATABASE_URL"] = "postgresql+psycopg://krishnanegi@localhost:5433/cyberguard_x_restore_test"
