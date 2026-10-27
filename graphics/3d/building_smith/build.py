"""Rebuild the smithy with four independently rendered architecture layers."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from building_studio import smith
studio=smith()
