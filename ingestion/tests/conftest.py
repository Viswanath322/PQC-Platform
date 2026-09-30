"""Pytest configuration for ingestion tests."""

import sys
from pathlib import Path

# Add the parent directory to sys.path so ingestion package can be imported
ingestion_root = Path(__file__).parent.parent.parent
if str(ingestion_root) not in sys.path:
    sys.path.insert(0, str(ingestion_root))
