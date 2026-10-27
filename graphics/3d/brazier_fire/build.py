"""Upright flame layer for a separate brazier bowl or forge."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from flame_effect import build
build('brazier_fire',height=.62,width=.34,tongues=5,coals=False,sparks=3)
