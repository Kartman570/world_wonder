"""Rebuild architecture with independent floor, walls, facade and roof."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from building_architecture import building
studio=building('building_provisions')
