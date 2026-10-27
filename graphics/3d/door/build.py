"""Rebuild the shared medieval door: closed, open, locked and broken."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from building_studio import door
studio=door()
