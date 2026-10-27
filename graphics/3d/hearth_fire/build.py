"""Broad low hearth flame; masonry and logs remain a separate static object."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from flame_effect import build
build('hearth_fire',height=.43,width=.40,tongues=5,coals=False,sparks=2)
