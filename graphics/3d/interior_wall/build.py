"""Rebuild fixed-canvas architecture components."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from building_architecture import generic
studio=generic('interior_wall')
