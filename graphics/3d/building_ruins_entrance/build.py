"""Rebuild fixed-canvas architecture components."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from building_architecture import special
studio=special('building_ruins_entrance')
